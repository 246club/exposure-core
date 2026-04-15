import { canonicalizeNodeId, canonicalizeProtocolToken } from "@/lib/nodeId";

export interface AssetDashboardTarget {
  id: string;
  chain?: string | null;
  protocol?: string | null;
  name?: string | null;
  displayName?: string | null;
  logoKeys?: string[] | null;
}

const normalizeToken = (value: string | null | undefined): string =>
  (value ?? "").trim().toLowerCase();

const buildAssetQuery = (target: AssetDashboardTarget): string => {
  const params = new URLSearchParams();
  const chain = normalizeToken(target.chain);
  const protocol = target.protocol
    ? canonicalizeProtocolToken(target.protocol)
    : "";

  if (chain) params.set("chain", chain);
  if (protocol) params.set("protocol", protocol);

  const query = params.toString();
  return query ? `?${query}` : "";
};

export const buildAssetGraphHref = (target: AssetDashboardTarget): string => {
  const normalizedId = canonicalizeNodeId(target.id);
  if (!normalizedId) return "/";

  return `/asset/${encodeURIComponent(normalizedId)}${buildAssetQuery(target)}`;
};

export const buildAssetDashboardHref = (
  target: AssetDashboardTarget,
): string => {
  const normalizedId = canonicalizeNodeId(target.id);
  if (!normalizedId) return "/";

  return `/asset/${encodeURIComponent(normalizedId)}/dashboard${buildAssetQuery(target)}`;
};

const RESOLV_INCIDENT_TOKENS = new Set([
  "usr",
  "wstusr",
  "rlp",
  "resolv",
  "resolv usd",
  "wrapped staked usr",
  "resolv liquidity pool",
  "mc_usr",
]);

export const resolveKnownIncidentSlug = (
  target: AssetDashboardTarget,
): string | null => {
  const normalizedId = canonicalizeNodeId(target.id);
  const candidates = new Set<string>([
    normalizedId,
    normalizeToken(target.name),
    normalizeToken(target.displayName),
    normalizeToken(target.chain),
    normalizeToken(target.protocol),
  ]);

  for (const logoKey of target.logoKeys ?? []) {
    candidates.add(normalizeToken(logoKey));
  }

  for (const value of Array.from(candidates)) {
    if (!value) continue;

    if (
      RESOLV_INCIDENT_TOKENS.has(value) ||
      value.startsWith("eth:resolv:") ||
      value.startsWith("base:resolv:") ||
      value.startsWith("global:resolv:")
    ) {
      return "resolv";
    }
  }

  return null;
};

export const buildExposureDashboardHref = (
  target: AssetDashboardTarget,
): string => {
  const incidentSlug = resolveKnownIncidentSlug(target);
  if (incidentSlug) {
    return `/incident/${incidentSlug}`;
  }

  return buildAssetDashboardHref(target);
};
