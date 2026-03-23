import { notFound } from "next/navigation";
import Link from "next/link";
import { loadIncidentConfig } from "@/lib/incident/config";
import { detectToxicExposure } from "@/lib/incident/detection";
import { loadProtocolSnapshots } from "@/lib/graphLoader";
import { inferProtocolFolderFromNodeId } from "@/lib/blobPaths";
import type {
  AdapterVault,
  VaultExposure,
  ToxicBreakdownEntry,
} from "@/lib/incident/types";
import { slugifyVaultName } from "@/lib/incident/types";
import type { GraphSnapshot } from "@/types";
import { VaultHero } from "@/components/incident/VaultHero";

export const revalidate = 600;

function formatUsd(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

async function loadVaultData(
  slug: string,
  id: string,
): Promise<{ vaultExposure: VaultExposure; slugParam: string } | null> {
  const config = await loadIncidentConfig(slug);
  if (!config) return null;

  const toxicSymbols = config.toxicAssets.map((a) => a.symbol);

  // Find the matching vault by slugified name
  const matchedVault = config.affectedVaults.find(
    (v) => slugifyVaultName(v.name) === id,
  );
  if (!matchedVault) return null;

  // If manual vault, no snapshot loading needed
  if (matchedVault.source === "manual") {
    const vaultExposure: VaultExposure = {
      vault: matchedVault,
      status: matchedVault.exposureUsd > 0 ? "loaded" : "pending",
      totalAllocationUsd: matchedVault.exposureUsd,
      toxicExposureUsd: matchedVault.exposureUsd,
      exposurePct: matchedVault.exposureUsd > 0 ? 1 : 0,
      breakdown: matchedVault.toxicAssetBreakdown,
    };
    return { vaultExposure, slugParam: slug };
  }

  // Adapter vault — load snapshots
  const adapterVault = matchedVault as AdapterVault;
  const protocolFolders = new Set<string>();
  for (const nodeId of Object.values(adapterVault.nodeIds)) {
    const folder = inferProtocolFolderFromNodeId(nodeId);
    if (folder) protocolFolders.add(folder);
  }

  const snapshotsByProtocol = new Map<string, Record<string, GraphSnapshot>>();
  await Promise.all(
    Array.from(protocolFolders).map(async (folder) => {
      const snapshots = await loadProtocolSnapshots(folder);
      snapshotsByProtocol.set(folder, snapshots);
    }),
  );

  let totalAlloc = 0;
  let totalToxic = 0;
  const assetTotals = new Map<string, number>();
  const allToxicAllocations: VaultExposure["toxicAllocations"] = [];
  const chainBreakdown: NonNullable<VaultExposure["chainBreakdown"]> = {};
  let anyLoaded = false;

  for (const [chain, nodeId] of Object.entries(adapterVault.nodeIds)) {
    const folder = inferProtocolFolderFromNodeId(nodeId);
    const snapshots = folder ? snapshotsByProtocol.get(folder) : undefined;
    const snapshot = snapshots?.[nodeId] ?? null;

    const result = detectToxicExposure(
      snapshot,
      nodeId,
      toxicSymbols,
      config.toxicAssetNodeIds,
    );

    if (result.status === "loaded") {
      anyLoaded = true;
      totalAlloc += result.totalAllocationUsd;
      totalToxic += result.toxicExposureUsd;
      for (const b of result.breakdown) {
        assetTotals.set(b.asset, (assetTotals.get(b.asset) ?? 0) + b.amountUsd);
      }
      if (result.toxicAllocations) {
        allToxicAllocations.push(...result.toxicAllocations);
      }
      chainBreakdown[chain] = {
        nodeId,
        totalAllocationUsd: result.totalAllocationUsd,
        toxicExposureUsd: result.toxicExposureUsd,
        breakdown: result.breakdown,
      };
    }
  }

  const breakdown: ToxicBreakdownEntry[] = Array.from(
    assetTotals.entries(),
  ).map(([asset, amountUsd]) => ({
    asset,
    amountUsd,
    pct: totalAlloc > 0 ? amountUsd / totalAlloc : 0,
  }));

  const vaultExposure: VaultExposure = {
    vault: adapterVault,
    status: anyLoaded ? "loaded" : "pending",
    totalAllocationUsd: totalAlloc,
    toxicExposureUsd: totalToxic,
    exposurePct: totalAlloc > 0 ? totalToxic / totalAlloc : 0,
    breakdown,
    chainBreakdown:
      Object.keys(chainBreakdown).length > 0 ? chainBreakdown : undefined,
    toxicAllocations:
      allToxicAllocations.length > 0 ? allToxicAllocations : undefined,
  };

  return { vaultExposure, slugParam: slug };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string; id: string }>;
}) {
  const { slug, id } = await params;
  const config = await loadIncidentConfig(slug);
  if (!config) return {};

  const matchedVault = config.affectedVaults.find(
    (v) => slugifyVaultName(v.name) === id,
  );
  if (!matchedVault) return {};

  const title = `${matchedVault.name} — ${config.title}`;
  const description = `Vault exposure detail for ${matchedVault.name} in the ${config.title} incident.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
    },
  };
}

export default async function VaultDetailPage({
  params,
}: {
  params: Promise<{ slug: string; id: string }>;
}) {
  const { slug, id } = await params;

  const config = await loadIncidentConfig(slug);
  if (!config) notFound();

  const result = await loadVaultData(slug, id);
  if (!result) notFound();

  const { vaultExposure } = result;
  const vault = vaultExposure.vault;

  // For the "View full allocation graph" link, get first nodeId from adapter vault
  const firstNodeId =
    vault.source === "adapter"
      ? Object.values((vault as AdapterVault).nodeIds)[0]
      : null;

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      {/* Section 1: VaultHero */}
      <VaultHero vault={vaultExposure} toxicAssets={config.toxicAssets} />

      {/* Section 2: Toxic Allocations Table */}
      <section className="mb-10">
        <h2 className="text-lg font-semibold text-white mb-4">
          Toxic Allocations
        </h2>
        {vaultExposure.toxicAllocations &&
        vaultExposure.toxicAllocations.length > 0 ? (
          <div
            className="overflow-x-auto rounded-lg"
            style={{ border: "1px solid rgba(255,255,255,0.06)" }}
          >
            <table className="w-full text-sm">
              <thead
                className="text-xs uppercase"
                style={{
                  backgroundColor: "#09090b",
                  borderBottom: "1px solid rgba(255,255,255,0.06)",
                  color: "rgba(255,255,255,0.35)",
                }}
              >
                <tr>
                  <th className="px-4 py-3 text-left whitespace-nowrap">
                    Market Name
                  </th>
                  <th className="px-4 py-3 text-left whitespace-nowrap">
                    Chain
                  </th>
                  <th className="px-4 py-3 text-left whitespace-nowrap">
                    Toxic Asset
                  </th>
                  <th className="px-4 py-3 text-right whitespace-nowrap">
                    At-Risk Allocation
                  </th>
                </tr>
              </thead>
              <tbody>
                {vaultExposure.toxicAllocations.map((alloc, i) => (
                  <tr
                    key={i}
                    style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}
                  >
                    <td className="px-4 py-3 text-white font-medium">
                      {alloc.nodeName}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className="rounded px-1.5 py-0.5 text-xs font-mono uppercase"
                        style={{
                          backgroundColor: "rgba(255,255,255,0.06)",
                          color: "rgba(255,255,255,0.50)",
                        }}
                      >
                        {alloc.chain}
                      </span>
                    </td>
                    <td
                      className="px-4 py-3 font-mono text-xs"
                      style={{ color: "rgba(255,255,255,0.70)" }}
                    >
                      {alloc.asset}
                    </td>
                    <td
                      className="px-4 py-3 text-right font-mono"
                      style={{ color: "rgba(255,255,255,0.70)" }}
                    >
                      {formatUsd(alloc.allocationUsd)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm" style={{ color: "rgba(255,255,255,0.35)" }}>
            No detailed allocation data available.
          </p>
        )}
      </section>

      {/* Section 3: Protocol Response */}
      {vault.statusNote && (
        <section className="mb-10">
          <h2 className="text-lg font-semibold text-white mb-4">
            Protocol Response
          </h2>
          <div
            className="rounded-lg p-6"
            style={{
              backgroundColor:
                vault.status === "covering"
                  ? "rgba(16,185,129,0.06)"
                  : "rgba(255,255,255,0.02)",
              border:
                vault.status === "covering"
                  ? "1px solid rgba(16,185,129,0.15)"
                  : "1px solid rgba(255,255,255,0.06)",
            }}
          >
            {vault.status === "covering" && (
              <div
                className="flex items-center gap-2 mb-3"
                style={{ color: "#10b981" }}
              >
                <div
                  className="h-2 w-2 rounded-full flex-shrink-0"
                  style={{ backgroundColor: "#10b981" }}
                />
                <span className="text-xs font-medium uppercase tracking-wider">
                  Covering bad debt
                </span>
              </div>
            )}
            <p
              className="text-sm leading-relaxed"
              style={{ color: "rgba(255,255,255,0.70)" }}
            >
              {vault.statusNote}
            </p>
            {vault.statusSource && (
              <a
                href={vault.statusSource}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block mt-3 text-sm transition-colors hover:opacity-80"
                style={{
                  color:
                    vault.status === "covering"
                      ? "#10b981"
                      : "rgba(255,255,255,0.50)",
                }}
              >
                View announcement →
              </a>
            )}
          </div>
        </section>
      )}

      {/* Section 4: Navigation Links */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-6 border-t border-white/[0.06]">
        <Link
          href={`/incident/${slug}/dashboard`}
          className="text-sm transition-colors hover:text-white"
          style={{ color: "rgba(255,255,255,0.50)" }}
        >
          ← Back to dashboard
        </Link>
        {firstNodeId && (
          <Link
            href={`/asset/${encodeURIComponent(firstNodeId)}`}
            className="text-sm transition-colors hover:text-white"
            style={{ color: "rgba(255,255,255,0.50)" }}
          >
            View full allocation graph →
          </Link>
        )}
      </div>
    </div>
  );
}
