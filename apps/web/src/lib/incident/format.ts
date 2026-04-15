const COMPACT_UNITS = [
  { value: 1_000_000_000_000, suffix: "T" },
  { value: 1_000_000_000, suffix: "B" },
  { value: 1_000_000, suffix: "M" },
  { value: 1_000, suffix: "K" },
] as const;

function trimTrailingZeros(value: string): string {
  if (!value.includes(".")) return value;

  const [whole, fraction] = value.split(".");
  const trimmedFraction = fraction.replace(/0+$/, "");
  return trimmedFraction.length > 0 ? `${whole}.${trimmedFraction}` : whole;
}

function formatCompactValue(value: number): string {
  const absoluteValue = Math.abs(value);

  for (let index = 0; index < COMPACT_UNITS.length; index += 1) {
    const unit = COMPACT_UNITS[index];
    if (absoluteValue < unit.value) continue;

    const compactValue = value / unit.value;
    const rounded = Number(compactValue.toFixed(2));

    if (Math.abs(rounded) >= 1000 && index > 0) {
      const nextUnit = COMPACT_UNITS[index - 1];
      return `${trimTrailingZeros((value / nextUnit.value).toFixed(2))}${nextUnit.suffix}`;
    }

    return `${trimTrailingZeros(rounded.toFixed(2))}${unit.suffix}`;
  }

  if (Number.isInteger(value)) {
    return new Intl.NumberFormat("en-US", {
      maximumFractionDigits: 0,
    }).format(value);
  }

  return trimTrailingZeros(
    new Intl.NumberFormat("en-US", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(value),
  );
}

export function formatUsdCompact(value: number): string {
  if (value === 0) return "$0";
  return `${value < 0 ? "-" : ""}$${formatCompactValue(Math.abs(value))}`;
}

export function formatNumberCompact(value: number): string {
  if (value === 0) return "0";
  return formatCompactValue(value);
}

/** Format a ratio (0–1) as a percentage string like "12.5%" */
export function formatPercent(ratio: number): string {
  return `${(ratio * 100).toFixed(1)}%`;
}

export function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
