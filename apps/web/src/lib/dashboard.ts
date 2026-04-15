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

export const buildExposureDashboardHref = (
  target: AssetDashboardTarget,
): string => {
  return buildAssetDashboardHref(target);
};
