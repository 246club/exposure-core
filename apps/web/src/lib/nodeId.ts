export const canonicalizeProtocolToken = (raw: string): string => {
  const p = raw
    .trim()
    .toLowerCase()
    .replace(/[_\s]+/g, "-");

  if (p.startsWith("morpho")) {
    if (p.includes("v2")) return "morpho-v2";
    if (p.includes("v1")) return "morpho-v1";
    return "morpho";
  }

  if (p.startsWith("euler")) {
    if (p.includes("v2")) return "euler-v2";
    if (p.includes("v1")) return "euler-v1";
    return "euler";
  }

  return p;
};

export const canonicalizeNodeId = (raw: string): string => {
  const normalized = raw.trim();
  if (!normalized) return "";

  const parts = normalized.split(":");
  if (parts.length < 2) return normalized.toLowerCase();

  const chain = parts[0].trim().toLowerCase();
  const protocol = canonicalizeProtocolToken(parts[1] ?? "");
  const rest = parts.slice(2).join(":").trim().toLowerCase();

  return rest ? `${chain}:${protocol}:${rest}` : `${chain}:${protocol}`;
};

const ADDRESS_PATTERN = /^0x[a-f0-9]{40}$/;

export const extractAddressKeyFromNodeId = (raw: string): string | null => {
  const normalized = canonicalizeNodeId(raw);
  if (!normalized) return null;

  const parts = normalized.split(":");
  if (parts.length !== 3) return null;

  const [chain, , address] = parts;
  if (!chain || !address || !ADDRESS_PATTERN.test(address)) return null;

  return `${chain}:${address}`;
};
