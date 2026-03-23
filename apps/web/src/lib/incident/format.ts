export function formatUsdCompact(value: number): string {
  if (value === 0) return "$0";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: "compact",
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatNumberCompact(value: number): string {
  if (value === 0) return "0";
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 2,
  }).format(value);
}

/** Format a ratio (0–1) as a percentage string like "12.5%" */
export function formatPercent(ratio: number): string {
  return `${(ratio * 100).toFixed(1)}%`;
}

export function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
