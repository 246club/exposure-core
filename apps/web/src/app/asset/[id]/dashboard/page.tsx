"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { Activity } from "lucide-react";

import { type SearchIndexEntry } from "@/constants";
import { useAssetData } from "@/hooks/useAssetData";
import { buildAssetGraphHref } from "@/lib/dashboard";
import { getNodeLogos } from "@/lib/logos";
import { canonicalizeNodeId, canonicalizeProtocolToken } from "@/lib/nodeId";
import { prepareSearchIndex } from "@/lib/search";
import type { GraphNode } from "@/types";
import { IncidentNav } from "@/components/incident/IncidentNav";
import { IncidentBanner } from "@/components/incident/IncidentBanner";
import { BadDebtPanel } from "@/components/incident/BadDebtPanel";
import { MetricCard } from "@/components/incident/MetricCard";
import {
  TimelinePanel,
  type TimelineEntry,
} from "@/components/incident/TimelinePanel";
import { VaultTable } from "@/components/incident/VaultTable";
import {
  ToxicAssetDonut,
  type DonutEntry,
} from "@/components/incident/ToxicAssetDonut";
import {
  DistributionRadar,
  type RadarEntry,
} from "@/components/incident/DistributionRadar";
import { AnimatedCounter } from "@/components/incident/AnimatedCounter";
import { ExposureDashboardBody } from "@/components/incident/ExposureDashboardBody";
import { ProtocolRow } from "@/components/incident/ProtocolRow";
import {
  PriceChart,
  type PriceChartAsset,
} from "@/components/incident/PriceChart";
import { AssetCuratorExposureGrid } from "@/components/incident/AssetCuratorExposureGrid";
import { formatUsdCompact } from "@/lib/incident/format";
import {
  getChainDisplayName,
  getChainIcon,
  getEntityInitials,
  getCuratorIcon,
  getProtocolDisplay,
  getProtocolIcon,
} from "@/lib/incident/logos";
import type { IncidentSummary, VaultExposure } from "@/lib/incident/types";

const BUCKET_COLORS = [
  "#5792ff",
  "#c4daff",
  "#e89220",
  "#00A35C",
  "#E11D48",
  "#7c3aed",
  "#0ea5e9",
  "#f59e0b",
];

const normalizeKey = (value: string | null | undefined): string =>
  (value ?? "").trim().toLowerCase();

const slugifyToken = (value: string | null | undefined): string =>
  normalizeKey(value)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const formatUtcTimelineDate = (date: Date): string => {
  const datePart = date.toLocaleDateString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  });
  const timePart = date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "UTC",
  });

  return `${datePart} · ${timePart} UTC`;
};

const formatBannerDate = (date: Date): string =>
  date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });

interface BucketMeta {
  symbol: string;
  name: string;
  color: string;
  iconPath: string | null;
}

interface ProtocolRowBreakdown {
  asset: string;
  amountUsd: number;
  color: string;
}

interface DashboardProtocolRow {
  name: string;
  logoSrc?: string;
  fallbackInitials: string;
  fallbackColor: string;
  meta: string;
  amount?: string;
  statusText?: string;
  breakdown?: ProtocolRowBreakdown[];
}

interface IncludedExposureResponse {
  targetSymbol: string;
  vaults: VaultExposure[];
  summary: IncidentSummary;
}

const buildDashboardPageData = ({
  response,
  dashboardLabel,
  activeRootEntry,
  rootNode,
}: {
  response: IncludedExposureResponse;
  dashboardLabel: string;
  activeRootEntry?: SearchIndexEntry;
  rootNode: GraphNode | null;
}) => {
  const vaults = response.vaults;
  const summary = response.summary;
  const rootLogoPath =
    getNodeLogos(
      rootNode ?? {
        name: activeRootEntry?.name ?? dashboardLabel,
        displayName: activeRootEntry?.displayName,
        protocol: activeRootEntry?.protocol ?? undefined,
        logoKeys: activeRootEntry?.logoKeys ?? undefined,
      },
    )[0] ?? null;
  const rootAssetKeys = new Set(
    [
      response.targetSymbol,
      activeRootEntry?.displayName,
      ...(activeRootEntry?.logoKeys ?? []),
      activeRootEntry?.name,
      rootNode?.displayName,
      rootNode?.name,
    ]
      .map((value) => normalizeKey(value))
      .filter(Boolean),
  );
  const bucketRegistry = new Map<string, BucketMeta>();
  let nextColorIndex = 0;

  const ensureBucket = (label: string): BucketMeta => {
    const key = normalizeKey(label);
    const existing = bucketRegistry.get(key);
    if (existing) return existing;

    const bucket: BucketMeta = {
      symbol: label,
      name: label,
      color: BUCKET_COLORS[nextColorIndex % BUCKET_COLORS.length],
      iconPath: rootAssetKeys.has(key) ? rootLogoPath : null,
    };
    nextColorIndex += 1;
    bucketRegistry.set(key, bucket);
    return bucket;
  };

  for (const asset of Object.keys(summary.byAsset)) {
    ensureBucket(asset);
  }

  const bucketBySymbol = new Map<string, BucketMeta>(
    Array.from(bucketRegistry.values()).map((bucket) => [
      bucket.symbol,
      bucket,
    ]),
  );
  const toxicAssets = Array.from(bucketRegistry.values()).map((bucket) => ({
    symbol: bucket.symbol,
    name: bucket.name,
    color: bucket.color,
  }));

  const assetEntries = Object.entries(summary.byAsset).sort(
    ([, left], [, right]) => right.exposureUsd - left.exposureUsd,
  );
  const donutEntries: DonutEntry[] = assetEntries.map(([symbol, entry]) => {
    const bucket = bucketBySymbol.get(symbol);
    return {
      symbol,
      exposureUsd: entry.exposureUsd,
      color: bucket?.color ?? BUCKET_COLORS[0],
      iconPath: bucket?.iconPath ?? null,
    };
  });

  const aggregateBreakdown = (
    subset: VaultExposure[],
  ): ProtocolRowBreakdown[] => {
    const totals = new Map<string, number>();

    for (const vault of subset) {
      for (const breakdown of vault.breakdown) {
        ensureBucket(breakdown.asset);
        totals.set(
          breakdown.asset,
          (totals.get(breakdown.asset) ?? 0) + breakdown.amountUsd,
        );
      }
    }

    return Array.from(totals.entries())
      .map(([asset, amountUsd]) => ({
        asset,
        amountUsd,
        color:
          bucketRegistry.get(normalizeKey(asset))?.color ?? BUCKET_COLORS[0],
      }))
      .sort((left, right) => right.amountUsd - left.amountUsd)
      .slice(0, 4);
  };

  const protocolRows: DashboardProtocolRow[] = Object.entries(
    summary.byProtocol,
  )
    .sort(([, left], [, right]) => right.exposureUsd - left.exposureUsd)
    .map(([protocolKey, entry]) => {
      const display = getProtocolDisplay(protocolKey);
      return {
        name: display.name,
        logoSrc: getProtocolIcon(protocolKey),
        fallbackInitials: display.initials,
        fallbackColor: display.color,
        meta: `${entry.vaultCount} including vault${entry.vaultCount === 1 ? "" : "s"}`,
        breakdown: aggregateBreakdown(
          vaults.filter((vault) => vault.vault.protocol === protocolKey),
        ),
      };
    });

  const curatorRows: DashboardProtocolRow[] = Array.from(
    vaults
      .reduce(
        (map, vault) => {
          const key = vault.vault.curator?.trim() || vault.vault.protocol;
          const existing = map.get(key) ?? {
            name: key,
            exposureUsd: 0,
            vaults: [] as VaultExposure[],
            protocol: vault.vault.protocol,
          };
          existing.exposureUsd += vault.toxicExposureUsd;
          existing.vaults.push(vault);
          map.set(key, existing);
          return map;
        },
        new Map<
          string,
          {
            name: string;
            exposureUsd: number;
            vaults: VaultExposure[];
            protocol: string;
          }
        >(),
      )
      .values(),
  )
    .sort((left, right) => right.exposureUsd - left.exposureUsd)
    .map((entry) => {
      const display = getProtocolDisplay(entry.protocol);
      return {
        name: entry.name,
        logoSrc: getCuratorIcon(entry.name) ?? getProtocolIcon(entry.protocol),
        fallbackInitials: getEntityInitials(entry.name),
        fallbackColor: display.color,
        meta: `${entry.vaults.length} including vault${entry.vaults.length === 1 ? "" : "s"}`,
        breakdown: aggregateBreakdown(entry.vaults),
      };
    });

  const curatorExposureItems = Array.from(
    vaults
      .reduce(
        (map, vault) => {
          const key = vault.vault.curator?.trim() || vault.vault.protocol;
          const existing = map.get(key) ?? {
            curator: key,
            protocol: vault.vault.protocol,
            vaultCount: 0,
            exposureUsd: 0,
          };
          existing.vaultCount += 1;
          existing.exposureUsd += vault.toxicExposureUsd;
          map.set(key, existing);
          return map;
        },
        new Map<
          string,
          {
            curator: string;
            protocol: string;
            vaultCount: number;
            exposureUsd: number;
          }
        >(),
      )
      .values(),
  ).sort((left, right) => right.exposureUsd - left.exposureUsd);
  const curatorExposureBadges = assetEntries
    .slice(0, 3)
    .map(([symbol, entry]) => ({
      label: symbol,
      value: formatUsdCompact(entry.exposureUsd),
    }));

  const connectedRootExposureUsd = vaults
    .filter(
      (vault) =>
        vault.vault.status === "covering" || vault.vault.status === "recovered",
    )
    .reduce((sum, vault) => sum + vault.toxicExposureUsd, 0);
  const coveringProtocols = Array.from(
    vaults.reduce((map, vault) => {
      if (
        vault.vault.status !== "covering" &&
        vault.vault.status !== "recovered"
      ) {
        return map;
      }
      if (!map.has(vault.vault.protocol)) {
        map.set(vault.vault.protocol, {
          name: vault.vault.name,
          protocol: vault.vault.protocol,
        });
      }
      return map;
    }, new Map<string, { name: string; protocol: string }>()),
  ).map(([, value]) => value);
  const connectedRootCount = vaults.filter(
    (vault) =>
      vault.vault.status === "covering" || vault.vault.status === "recovered",
  ).length;
  const topVault = [...vaults].sort(
    (left, right) => right.toxicExposureUsd - left.toxicExposureUsd,
  )[0];
  const topProtocol = protocolRows[0];
  const topVaultExposureUsd = topVault?.toxicExposureUsd ?? 0;
  const topVaultShare =
    summary.totalToxicExposureUsd > 0
      ? topVaultExposureUsd / summary.totalToxicExposureUsd
      : 0;

  const buildRadarEntries = (
    source: Record<string, { exposureUsd: number; vaultCount: number }>,
    getIcon: (key: string) => string,
    getLabel: (key: string) => string,
  ): RadarEntry[] => {
    const total = Object.values(source).reduce(
      (sum, value) => sum + value.exposureUsd,
      0,
    );

    return Object.entries(source)
      .map(([key, value]) => ({
        name: getLabel(key),
        value: total > 0 ? (value.exposureUsd / total) * 100 : 0,
        iconSrc: getIcon(key),
      }))
      .sort((left, right) => right.value - left.value);
  };

  const protocolRadarEntries = buildRadarEntries(
    summary.byProtocol,
    getProtocolIcon,
    (key) => getProtocolDisplay(key).name,
  );
  const chainRadarEntries = buildRadarEntries(
    summary.byChain,
    getChainIcon,
    getChainDisplayName,
  );

  const now = new Date();
  const timelineEntries: TimelineEntry[] = [
    {
      date: formatUtcTimelineDate(now),
      tag: "update",
      text:
        summary.vaultCount > 0
          ? `${dashboardLabel} is currently included across ${summary.vaultCount} tracked vault${summary.vaultCount === 1 ? "" : "s"}.`
          : `${dashboardLabel} is not currently detected inside any tracked vault.`,
    },
    {
      date: formatUtcTimelineDate(new Date(now.getTime() - 15 * 60 * 1000)),
      tag: "response",
      text: topVault
        ? `${topVault.vault.name} has the single largest included exposure to ${dashboardLabel}.`
        : `No direct including vault currently exceeds the detection threshold for ${dashboardLabel}.`,
    },
    {
      date: formatUtcTimelineDate(new Date(now.getTime() - 30 * 60 * 1000)),
      tag: "curator",
      text: `${curatorRows.length} curator bucket${curatorRows.length === 1 ? "" : "s"} identified across including vaults.`,
    },
    {
      date: formatUtcTimelineDate(new Date(now.getTime() - 45 * 60 * 1000)),
      tag: "update",
      text: topProtocol
        ? `${topProtocol.name} is the dominant protocol currently holding ${dashboardLabel}.`
        : `Protocol-level included exposure for ${dashboardLabel} is currently unavailable.`,
    },
    {
      date: formatUtcTimelineDate(new Date(now.getTime() - 60 * 60 * 1000)),
      tag: "response",
      text: `${Object.keys(summary.byChain).length} chain${Object.keys(summary.byChain).length === 1 ? "" : "s"} currently contribute to included exposure.`,
    },
    {
      date: formatUtcTimelineDate(new Date(now.getTime() - 75 * 60 * 1000)),
      tag: "update",
      text: `Tracked vault TVL tied to ${dashboardLabel} totals ${formatUsdCompact(summary.totalAffectedTvlUsd)} in the current snapshot.`,
    },
  ];

  const priceAssets: PriceChartAsset[] = [
    {
      id:
        slugifyToken(activeRootEntry?.logoKeys?.[0]) ||
        slugifyToken(activeRootEntry?.displayName) ||
        slugifyToken(activeRootEntry?.name) ||
        slugifyToken(rootNode?.displayName) ||
        slugifyToken(rootNode?.name) ||
        slugifyToken(response.targetSymbol) ||
        "invalid-asset",
      symbol: response.targetSymbol,
      color: BUCKET_COLORS[0],
      peg: null,
    },
  ];

  return {
    vaults,
    summary,
    toxicAssets,
    donutEntries,
    protocolRows,
    curatorRows,
    curatorExposureItems,
    curatorExposureBadges,
    protocolRadarEntries,
    chainRadarEntries,
    timelineEntries,
    connectedRootExposureUsd,
    coveringProtocols,
    connectedRootCount,
    topVault,
    topVaultExposureUsd,
    topVaultShare,
    priceAssets,
  };
};

export default function AssetDashboardPage() {
  const params = useParams();
  const searchParams = useSearchParams();

  const id = params.id as string;
  const chain = searchParams.get("chain") ?? undefined;
  const protocol = searchParams.get("protocol") ?? undefined;

  const canonicalAssetId = useMemo(() => canonicalizeNodeId(id), [id]);
  const canonicalProtocol = useMemo(
    () => (protocol ? canonicalizeProtocolToken(protocol) : undefined),
    [protocol],
  );

  const { loading, rootNode } = useAssetData({
    id: canonicalAssetId,
    chain,
    protocol: canonicalProtocol,
  });

  const [dynamicIndex, setDynamicIndex] = useState<SearchIndexEntry[]>([]);
  const [includedExposure, setIncludedExposure] =
    useState<IncludedExposureResponse | null>(null);
  const [includedExposureLoading, setIncludedExposureLoading] = useState(false);
  const [includedExposureRequested, setIncludedExposureRequested] =
    useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const response = await fetch("/api/search-index");
        if (!response.ok) return;
        const json = (await response.json()) as SearchIndexEntry[];
        if (!Array.isArray(json)) return;
        setDynamicIndex(json);
      } catch {
        /* ignore */
      }
    };

    void load();
  }, []);

  const preparedIndex = useMemo(
    () => prepareSearchIndex(dynamicIndex),
    [dynamicIndex],
  );
  const activeRootEntry = useMemo(() => {
    return preparedIndex.find(
      (entry) => entry.normalizedId === canonicalAssetId,
    );
  }, [canonicalAssetId, preparedIndex]);

  const dashboardLabel =
    activeRootEntry?.displayName ??
    rootNode?.displayName ??
    activeRootEntry?.name ??
    rootNode?.name ??
    id;
  const graphHref = buildAssetGraphHref({
    id: canonicalAssetId,
    chain,
    protocol: canonicalProtocol ?? protocol,
  });

  useEffect(() => {
    if (loading || !canonicalAssetId) return;

    const controller = new AbortController();

    const load = async () => {
      setIncludedExposureRequested(true);
      setIncludedExposure(null);
      setIncludedExposureLoading(true);

      try {
        const query = new URLSearchParams();
        if (chain) query.set("chain", chain);
        if (canonicalProtocol) query.set("protocol", canonicalProtocol);

        const response = await fetch(
          `/api/asset/${encodeURIComponent(canonicalAssetId)}/included-exposure${
            query.size ? `?${query.toString()}` : ""
          }`,
          {
            cache: "no-store",
            signal: controller.signal,
          },
        );

        if (!response.ok) {
          throw new Error("Failed to load included exposure");
        }

        const json = (await response.json()) as IncludedExposureResponse;
        if (!controller.signal.aborted) {
          setIncludedExposure(json);
        }
      } catch (error) {
        if (controller.signal.aborted) return;
        console.error(error);
        setIncludedExposure(null);
      } finally {
        if (!controller.signal.aborted) {
          setIncludedExposureLoading(false);
        }
      }
    };

    void load();

    return () => controller.abort();
  }, [canonicalAssetId, canonicalProtocol, chain, loading]);

  const pageData = useMemo(() => {
    if (!includedExposure) return null;

    return buildDashboardPageData({
      response: includedExposure,
      dashboardLabel,
      activeRootEntry,
      rootNode: rootNode ?? null,
    });
  }, [activeRootEntry, dashboardLabel, includedExposure, rootNode]);

  if (
    loading ||
    includedExposureLoading ||
    (!includedExposure && !includedExposureRequested)
  ) {
    return (
      <div
        className="incident-theme dark min-h-screen flex items-center justify-center"
        style={{ backgroundColor: "var(--surface-secondary)" }}
      >
        <div
          className="flex items-center gap-3 rounded-xl px-5 py-4"
          style={{
            backgroundColor: "var(--surface)",
            border: "1px solid var(--border)",
          }}
        >
          <Activity className="w-4 h-4 animate-pulse" />
          <span
            className="uppercase font-semibold"
            style={{ fontSize: 10, letterSpacing: "0.16em" }}
          >
            Loading Included Exposure
          </span>
        </div>
      </div>
    );
  }

  if (!pageData) {
    return (
      <div
        className="incident-theme dark min-h-screen flex items-center justify-center px-6"
        style={{ backgroundColor: "var(--surface-secondary)" }}
      >
        <div
          className="max-w-xl w-full px-6 py-6"
          style={{
            backgroundColor: "var(--surface)",
            border: "1px solid var(--border)",
          }}
        >
          <p
            className="uppercase font-black"
            style={{
              fontSize: 8,
              letterSpacing: "0.2em",
              color: "var(--text-tertiary)",
            }}
          >
            Dashboard Unavailable
          </p>
          <h1
            className="mt-3 font-mono font-bold"
            style={{ fontSize: 32, color: "var(--text-primary)" }}
          >
            {dashboardLabel}
          </h1>
          <p
            className="mt-3 text-sm leading-relaxed"
            style={{ color: "var(--text-secondary)" }}
          >
            Included exposure could not be derived from the current blob-backed
            graph data for this asset.
          </p>
          <div className="mt-6 flex gap-3">
            <Link
              href={graphHref}
              className="px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.12em] rounded-full bg-black text-white"
            >
              Back To Graph
            </Link>
            <Link
              href="/"
              className="px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.12em] rounded-full"
              style={{
                border: "1px solid var(--border)",
                color: "var(--text-secondary)",
              }}
            >
              Registry
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const timestamp = formatBannerDate(new Date(pageData.summary.dataTimestamp));

  return (
    <div
      className="incident-theme dark min-h-screen"
      style={{ backgroundColor: "var(--surface-secondary)" }}
    >
      <IncidentNav
        title={`${dashboardLabel} Exposure`}
        lastUpdated={pageData.summary.dataTimestamp}
      />
      <ExposureDashboardBody
        banner={
          <IncidentBanner
            title={`${dashboardLabel} Included Exposure`}
            description={`Where ${dashboardLabel} is currently included across tracked vaults, protocols, and chains.`}
            timestamp={timestamp}
            status="active"
          />
        }
        totalValue={
          <AnimatedCounter
            target={pageData.summary.totalToxicExposureUsd}
            format="usd"
          />
        }
        totalMeta={
          <>
            across {pageData.summary.vaultCount} vault
            {pageData.summary.vaultCount !== 1 ? "s" : ""} ·{" "}
            {pageData.summary.protocolCount} protocol
            {pageData.summary.protocolCount !== 1 ? "s" : ""}
          </>
        }
        priceChart={<PriceChart assets={pageData.priceAssets} />}
        statusTitle="Inclusion Status"
        statusPanel={
          <BadDebtPanel
            realizedDebt={pageData.summary.totalToxicExposureUsd}
            coveredDebt={pageData.topVaultExposureUsd}
            uncoveredGap={Math.max(
              0,
              pageData.summary.totalToxicExposureUsd -
                pageData.topVaultExposureUsd,
            )}
            recoveryRate={pageData.topVaultShare}
            coveringProtocols={pageData.coveringProtocols}
            labels={{
              realizedDebt: "Included Exposure",
              coveredDebt: "Largest Vault",
              uncoveredGap: "Other Vaults",
              recoveryRate: "Largest Share",
            }}
          />
        }
        donutPanel={
          <ToxicAssetDonut
            entries={pageData.donutEntries}
            total={pageData.summary.totalToxicExposureUsd}
          />
        }
        curatorTitle="Included Exposure by Curator"
        curatorPanel={
          <AssetCuratorExposureGrid
            items={pageData.curatorExposureItems}
            badges={pageData.curatorExposureBadges}
          />
        }
        metrics={
          <>
            <MetricCard
              label="Including Vaults"
              value={pageData.summary.vaultCount}
              format="number"
            />
            <MetricCard
              label="Protocols Impacted"
              value={pageData.summary.protocolCount}
              format="number"
            />
            <MetricCard
              label="Chains Impacted"
              value={Object.keys(pageData.summary.byChain).length}
              format="number"
            />
            <MetricCard
              label="Highest Exposure %"
              value={
                pageData.topVault ? pageData.topVault.exposurePct * 100 : 0
              }
              format="percent"
            />
          </>
        }
        protocolDistribution={
          <DistributionRadar entries={pageData.protocolRadarEntries} />
        }
        chainDistribution={
          <DistributionRadar entries={pageData.chainRadarEntries} />
        }
        protocolListTitle="Included Exposure by Protocol"
        protocolList={
          <div className="space-y-1">
            {pageData.protocolRows.map((row) => (
              <ProtocolRow
                key={row.name}
                name={row.name}
                logoSrc={row.logoSrc}
                fallbackInitials={row.fallbackInitials}
                fallbackColor={row.fallbackColor}
                meta={row.meta}
                amount={row.amount}
                statusText={row.statusText}
                breakdown={row.breakdown}
              />
            ))}
          </div>
        }
        timeline={<TimelinePanel entries={pageData.timelineEntries} />}
        tableTitle="All Including Vaults"
        table={
          <VaultTable
            vaults={pageData.vaults}
            toxicAssets={pageData.toxicAssets}
          />
        }
        lastUpdatedLabel={timestamp}
      />
    </div>
  );
}
