"use client";

interface StatusBadgeProps {
  status: "affected" | "covering" | "pending";
}

const STATUS_CONFIG: Record<
  StatusBadgeProps["status"],
  { dotColor: string; textColor: string; label: string }
> = {
  affected: {
    dotColor: "#E11D48",
    textColor: "rgba(0,0,0,0.55)",
    label: "Affected",
  },
  covering: {
    dotColor: "#2563eb",
    textColor: "rgba(0,0,0,0.55)",
    label: "Covering",
  },
  pending: {
    dotColor: "rgba(0,0,0,0.2)",
    textColor: "rgba(0,0,0,0.3)",
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
