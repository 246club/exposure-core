"use client";

interface StatusBadgeProps {
  status: "affected" | "covering" | "unknown";
  note?: string;
}

const STATUS_STYLES: Record<
  StatusBadgeProps["status"],
  { bg: string; text: string; label: string }
> = {
  affected: {
    bg: "rgba(239,68,68,0.15)",
    text: "#ef4444",
    label: "Affected",
  },
  covering: {
    bg: "rgba(16,185,129,0.15)",
    text: "#10b981",
    label: "Covering",
  },
  unknown: {
    bg: "rgba(245,158,11,0.15)",
    text: "#f59e0b",
    label: "Unknown",
  },
};

export function StatusBadge({ status, note }: StatusBadgeProps) {
  const { bg, text, label } = STATUS_STYLES[status];

  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium"
        style={{ backgroundColor: bg, color: text }}
        title={note}
      >
        {label}
      </span>
      {note && (
        <span className="text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>
          {note}
        </span>
      )}
    </span>
  );
}
