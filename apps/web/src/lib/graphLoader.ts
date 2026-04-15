import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { graphProtocolBlobPath } from "@/lib/blobPaths";
import { resolveRepoPathFromWebCwd } from "@/lib/repoPaths";
import { tryHeadBlobUrl } from "@/lib/vercelBlob";
import type { GraphSnapshot } from "@/types";

export interface BlobProtocolPayload {
  path: string;
  url: string;
  snapshots: Record<string, unknown>;
}

export interface FixtureProtocolPayload {
  path: string;
  snapshots: Record<string, unknown>;
}

export const isGraphSnapshot = (value: unknown): value is GraphSnapshot => {
  if (!value || typeof value !== "object") return false;

  const snapshot = value as Partial<GraphSnapshot>;
  return Array.isArray(snapshot.nodes) && Array.isArray(snapshot.edges);
};

export const loadBlobProtocolPayload = async (
  protocol: string,
): Promise<BlobProtocolPayload | null> => {
  const path = graphProtocolBlobPath(protocol);
  const url = await tryHeadBlobUrl(path);

  if (!url) return null;

  try {
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) return null;

    const payload = (await response.json()) as unknown;
    if (!payload || typeof payload !== "object") return null;

    return {
      path,
      url,
      snapshots: payload as Record<string, unknown>,
    };
  } catch (error) {
    console.error(`Failed to load snapshot group from ${url}:`, error);
    return null;
  }
};

export const loadFixtureProtocolPayload = async (
  protocol: string,
): Promise<FixtureProtocolPayload | null> => {
  const fixturesRoot = resolveRepoPathFromWebCwd(
    "server",
    "fixtures",
    "output",
  );
  const path = resolve(fixturesRoot, `${protocol}.json`);

  try {
    const raw = await readFile(path, "utf8");
    const payload = JSON.parse(raw) as unknown;
    if (!payload || typeof payload !== "object") return null;

    return {
      path,
      snapshots: payload as Record<string, unknown>,
    };
  } catch {
    return null;
  }
};

/**
 * Load all snapshots for a protocol (blob in prod, fixtures in dev).
 * Returns a map of nodeId → GraphSnapshot.
 */
export async function loadProtocolSnapshots(
  protocol: string,
): Promise<Record<string, GraphSnapshot>> {
  const isDev =
    process.env.NODE_ENV === "development" ||
    !process.env.BLOB_READ_WRITE_TOKEN;
  const payload = isDev
    ? await loadFixtureProtocolPayload(protocol)
    : await loadBlobProtocolPayload(protocol);

  if (!payload) return {};

  const result: Record<string, GraphSnapshot> = {};
  for (const [nodeId, value] of Object.entries(payload.snapshots)) {
    if (isGraphSnapshot(value)) {
      result[nodeId] = value;
    }
  }
  return result;
}
