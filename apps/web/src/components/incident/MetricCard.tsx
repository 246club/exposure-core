"use client";

interface MetricCardProps {
  label: string;
  value: number;
  format?: "usd" | "number" | "percent";
}

function formatValue(value: number, format: MetricCardProps["format"]): string {
  if (format === "usd") {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(value);
  }
  if (format === "percent") {
    return `${value.toFixed(1)}%`;
  }
  return new Intl.NumberFormat("en-US").format(value);
}

export function MetricCard({
  label,
  value,
  format = "number",
}: MetricCardProps) {
  return (
    <div
      className="rounded-lg p-4"
      style={{
        backgroundColor: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      <p
        className="text-xs uppercase tracking-wider mb-1"
        style={{ color: "rgba(255,255,255,0.35)" }}
      >
        {label}
      </p>
      <p className="font-mono text-2xl md:text-3xl font-bold text-white">
        {formatValue(value, format)}
      </p>
    </div>
  );
}
