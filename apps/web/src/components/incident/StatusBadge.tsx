"use client";

interface StatusBadgeProps {
  status: "affected" | "covering" | "pending" | "unknown";
}

const STATUS_STYLES: Record<
  StatusBadgeProps["status"],
  { bg: string; color: string; label: string }
> = {
  affected: {
    bg: "rgba(0,0,0,0.04)",
    color: "rgba(0,0,0,0.50)",
    label: "Affected",
  },
  covering: {
    bg: "rgba(0,163,92,0.08)",
    color: "rgba(0,163,92,0.70)",
    label: "Covering",
  },
  pending: {
    bg: "rgba(0,0,0,0.03)",
    color: "rgba(0,0,0,0.25)",
    label: "Pending",
  },
  unknown: {
    bg: "rgba(0,0,0,0.03)",
    color: "rgba(0,0,0,0.25)",
    label: "Unknown",
  },
};

export function StatusBadge({ status }: StatusBadgeProps) {
  const { bg, color, label } = STATUS_STYLES[status] ?? STATUS_STYLES.unknown;

  return (
    <span
      className="inline-flex items-center rounded-full"
      style={{
        backgroundColor: bg,
        color,
        fontSize: 8,
        fontWeight: 800,
        textTransform: "uppercase",
        letterSpacing: "0.1em",
        padding: "2px 8px",
      }}
    >
      {label}
    </span>
  );
}
