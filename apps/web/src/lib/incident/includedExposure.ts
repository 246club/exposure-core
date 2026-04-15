import { readFile } from "node:fs/promises";

import type { SearchIndexEntry } from "@/constants";
import { protocolToFolder, searchIndexBlobPath } from "@/lib/blobPaths";
import { resolveRootNode } from "@/lib/graph";
import { loadProtocolSnapshots } from "@/lib/graphLoader";
import { detectToxicExposure } from "@/lib/incident/detection";
import type {
  IncidentSummary,
  ManualVault,
  VaultExposure,
} from "@/lib/incident/types";
import {
  buildEntriesByAddress,
  canonicalizeNodeId,
  canonicalizeProtocolToken,
  extractAddressKeyFromNodeId,
  resolveAddressFallbackEntry,
} from "@/lib/nodeId";
import { resolveRepoPathFromWebCwd } from "@/lib/repoPaths";
import { tryHeadBlobUrl } from "@/lib/vercelBlob";
import type { GraphSnapshot } from "@/types";

const SEARCH_INDEX_FIXTURES_PATH = resolveRepoPathFromWebCwd(
  "server",
  "fixtures",
  "output",
  "search-index.json",
);

const normalizeText = (value: string | null | undefined): string =>
  (value ?? "").trim().toLowerCase();

interface IndexedSearchEntry extends SearchIndexEntry {
  normalizedEntryId: string;
  normalizedNodeId: string;
  normalizedId: string;
}

const toIndexedSearchEntries = (
  entries: SearchIndexEntry[],
): IndexedSearchEntry[] => {
  return entries.map((entry) => {
    const normalizedEntryId = canonicalizeNodeId(entry.id);
    const normalizedNodeId = canonicalizeNodeId(entry.nodeId || entry.id);

    return {
      ...entry,
      normalizedEntryId,
      normalizedNodeId,
      normalizedId: normalizedNodeId || normalizedEntryId,
    };
  });
};

const matchesScopedInput = (
  entry: SearchIndexEntry,
  input: { chain?: string; protocol?: string },
): boolean => {
  return (
    (!input.chain ||
      normalizeText(entry.chain) === normalizeText(input.chain)) &&
    (!input.protocol ||
      canonicalizeProtocolToken(entry.protocol) ===
        canonicalizeProtocolToken(input.protocol))
  );
};

const matchesExactTargetId = (
  entry: IndexedSearchEntry,
  normalizedId: string,
): boolean => {
  return (
    entry.normalizedEntryId === normalizedId ||
    entry.normalizedNodeId === normalizedId
  );
};

const resolvePrimaryEntry = (
  entries: IndexedSearchEntry[],
  input: { id: string; chain?: string; protocol?: string },
  normalizedId: string,
): IndexedSearchEntry | null => {
  const scopedEntries = entries.filter((entry) =>
    matchesScopedInput(entry, input),
  );

  const scopedExact = scopedEntries.find((entry) =>
    matchesExactTargetId(entry, normalizedId),
  );
  if (scopedExact) return scopedExact;

  const globalExact = entries.find((entry) =>
    matchesExactTargetId(entry, normalizedId),
  );
  if (globalExact) return globalExact;

  const scopedAddressFallback = resolveAddressFallbackEntry(
    normalizedId,
    input.protocol,
    buildEntriesByAddress(scopedEntries),
  );
  if (scopedAddressFallback) return scopedAddressFallback;

  return (
    resolveAddressFallbackEntry(
      normalizedId,
      input.protocol,
      buildEntriesByAddress(entries),
    ) ?? null
  );
};

const buildTrackedNodeIds = (
  entries: IndexedSearchEntry[],
  primaryEntry: IndexedSearchEntry,
): string[] => {
  const trackedIds = new Set<string>();
  const primaryId =
    primaryEntry.normalizedNodeId || primaryEntry.normalizedEntryId;

  if (primaryId) trackedIds.add(primaryId);

  for (const entry of entries) {
    if (matchesExactTargetId(entry, primaryId)) {
      trackedIds.add(entry.normalizedNodeId || entry.normalizedEntryId);
    }
  }

  const addressKey = extractAddressKeyFromNodeId(primaryId);
  if (!addressKey) {
    return Array.from(trackedIds).filter(Boolean);
  }

  const entriesByAddress = buildEntriesByAddress(entries);
  for (const entry of entriesByAddress.get(addressKey) ?? []) {
    trackedIds.add(entry.normalizedNodeId || entry.normalizedEntryId);
  }

  return Array.from(trackedIds).filter(Boolean);
};

const resolveTargetSymbol = (entry: SearchIndexEntry): string => {
  return (
    entry.displayName?.trim() ||
    entry.logoKeys?.[0]?.trim() ||
    entry.name.trim() ||
    entry.id
  );
};

const loadSearchIndexEntries = async (): Promise<SearchIndexEntry[]> => {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    try {
      const raw = await readFile(SEARCH_INDEX_FIXTURES_PATH, "utf8");
      const payload = JSON.parse(raw) as unknown;
      return Array.isArray(payload) ? (payload as SearchIndexEntry[]) : [];
    } catch {
      return [];
    }
  }

  const url = await tryHeadBlobUrl(searchIndexBlobPath());
  if (!url) return [];

  try {
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) return [];

    const payload = (await response.json()) as unknown;
    return Array.isArray(payload) ? (payload as SearchIndexEntry[]) : [];
  } catch {
    return [];
  }
};

const computeSummary = (vaults: VaultExposure[]): IncidentSummary => {
  const byProtocol: IncidentSummary["byProtocol"] = {};
  const byAsset: IncidentSummary["byAsset"] = {};
  const byChain: IncidentSummary["byChain"] = {};
  let totalTvl = 0;
  let totalExposure = 0;
  const protocols = new Set<string>();
  let coveringCount = 0;

  for (const vault of vaults) {
    totalTvl += vault.totalAllocationUsd;
    totalExposure += vault.toxicExposureUsd;
    protocols.add(vault.vault.protocol);
    if (vault.vault.status === "covering" || vault.vault.status === "recovered")
      coveringCount++;

    const protocolBucket = (byProtocol[vault.vault.protocol] ??= {
      exposureUsd: 0,
      vaultCount: 0,
    });
    protocolBucket.exposureUsd += vault.toxicExposureUsd;
    protocolBucket.vaultCount += 1;

    for (const breakdown of vault.breakdown) {
      const assetBucket = (byAsset[breakdown.asset] ??= { exposureUsd: 0 });
      assetBucket.exposureUsd += breakdown.amountUsd;
    }

    for (const chain of vault.vault.chains) {
      const chainBucket = (byChain[chain] ??= {
        exposureUsd: 0,
        vaultCount: 0,
      });
      chainBucket.exposureUsd += vault.toxicExposureUsd;
      chainBucket.vaultCount += 1;
    }
  }

  return {
    totalAffectedTvlUsd: totalTvl,
    totalToxicExposureUsd: totalExposure,
    vaultCount: vaults.length,
    protocolCount: protocols.size,
    coveringCount,
    byProtocol,
    byAsset,
    byChain,
    dataTimestamp: new Date().toISOString(),
  };
};

const resolveSnapshotForEntry = (
  snapshots: Record<string, GraphSnapshot>,
  entry: SearchIndexEntry,
): GraphSnapshot | null => {
  const normalizedTarget = canonicalizeNodeId(entry.id);

  return (
    snapshots[entry.id] ??
    snapshots[normalizedTarget] ??
    Object.entries(snapshots).find(
      ([candidateId]) => canonicalizeNodeId(candidateId) === normalizedTarget,
    )?.[1] ??
    null
  );
};

export interface IncludedExposureResponse {
  targetSymbol: string;
  vaults: VaultExposure[];
  summary: IncidentSummary;
}

export async function loadIncludedExposureForAsset(input: {
  id: string;
  chain?: string;
  protocol?: string;
}): Promise<IncludedExposureResponse | null> {
  const normalizedId = canonicalizeNodeId(input.id);
  if (!normalizedId) return null;

  const entries = toIndexedSearchEntries(await loadSearchIndexEntries());
  if (entries.length === 0) return null;

  const primaryEntry = resolvePrimaryEntry(entries, input, normalizedId);

  if (!primaryEntry) return null;

  const targetSymbol = resolveTargetSymbol(primaryEntry);
  const toxicNodeIds = buildTrackedNodeIds(entries, primaryEntry);

  const candidateEntriesByProtocol = new Map<string, SearchIndexEntry[]>();
  for (const entry of entries) {
    const folder = protocolToFolder(entry.protocol);
    if (!folder) continue;

    const existing = candidateEntriesByProtocol.get(folder);
    if (existing) {
      existing.push(entry);
    } else {
      candidateEntriesByProtocol.set(folder, [entry]);
    }
  }

  const vaults: VaultExposure[] = [];

  for (const [protocolFolder, protocolEntries] of Array.from(
    candidateEntriesByProtocol.entries(),
  )) {
    const snapshots = await loadProtocolSnapshots(protocolFolder);
    if (Object.keys(snapshots).length === 0) continue;

    for (const entry of protocolEntries) {
      const snapshot = resolveSnapshotForEntry(snapshots, entry);
      if (!snapshot) continue;

      const result = detectToxicExposure(
        snapshot,
        entry.id,
        [targetSymbol],
        toxicNodeIds,
      );

      if (result.status !== "loaded" || result.toxicExposureUsd <= 0) {
        continue;
      }

      const rootNode = resolveRootNode(snapshot.nodes, entry.id, entry.chain);
      const totalAllocationUsd = Math.max(
        typeof entry.tvlUsd === "number" && Number.isFinite(entry.tvlUsd)
          ? entry.tvlUsd
          : 0,
        result.totalAllocationUsd,
      );

      const vault: ManualVault = {
        source: "manual",
        name: rootNode?.name ?? entry.name,
        protocol: canonicalizeProtocolToken(
          rootNode?.protocol ?? entry.protocol,
        ),
        chains: [normalizeText(entry.chain || rootNode?.chain || "global")],
        curator: rootNode?.details?.curator ?? entry.curator ?? undefined,
        status: "affected",
        totalTvlUsd: totalAllocationUsd,
        exposureUsd: result.toxicExposureUsd,
        toxicAssetBreakdown: result.breakdown,
      };

      vaults.push({
        vault,
        status: result.status,
        totalAllocationUsd,
        toxicExposureUsd: result.toxicExposureUsd,
        exposurePct:
          totalAllocationUsd > 0
            ? result.toxicExposureUsd / totalAllocationUsd
            : 0,
        breakdown: result.breakdown,
        chainBreakdown: {
          [vault.chains[0] ?? "global"]: {
            nodeId: entry.id,
            totalAllocationUsd,
            toxicExposureUsd: result.toxicExposureUsd,
            breakdown: result.breakdown,
          },
        },
        toxicAllocations: result.toxicAllocations,
      });
    }
  }

  vaults.sort((left, right) => right.toxicExposureUsd - left.toxicExposureUsd);

  return {
    targetSymbol,
    vaults,
    summary: computeSummary(vaults),
  };
}
