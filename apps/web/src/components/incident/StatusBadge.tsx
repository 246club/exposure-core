"use client";

interface StatusBadgeProps {
  status: "affected" | "covering" | "recovered" | "pending";
}

const STATUS_CONFIG: Record<
  StatusBadgeProps["status"],
  { dotColor: string; textColor: string; label: string }
> = {
  affected: {
    dotColor: "#E11D48",
    textColor: "var(--text-secondary)",
    label: "Affected",
  },
  covering: {
    dotColor: "#2563eb",
    textColor: "var(--text-secondary)",
    label: "Promised",
  },
  recovered: {
    dotColor: "#00A35C",
    textColor: "var(--text-secondary)",
    label: "Recovered",
  },
  pending: {
    dotColor: "var(--text-tertiary)",
    textColor: "var(--text-tertiary)",
    label: "Pending",
  },
};

export function StatusBadge({ status }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.pending;

  return (
    <span
      className="inline-flex items-center gap-1.5"
      style={{
        color: config.textColor,
        fontSize: 9,
        fontWeight: 600,
        letterSpacing: "0.04em",
      }}
    >
      <span
        className="inline-block rounded-full flex-shrink-0"
        style={{
          width: 6,
          height: 6,
          backgroundColor: config.dotColor,
        }}
      />
      {config.label}
    </span>
  );
}
