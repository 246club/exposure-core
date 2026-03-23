"use client";

import { useState } from "react";
import { formatUsdCompact } from "@/lib/incident/format";
export { getCuratorLogoKey } from "@/lib/incident/logos";

interface BreakdownEntry {
  asset: string;
  amountUsd: number;
  color: string;
}

interface ProtocolRowProps {
  name: string;
  logoSrc?: string;
  fallbackInitials: string;
  fallbackColor: string;
  meta: string;
  amount?: string;
  statusText?: string;
  breakdown?: BreakdownEntry[];
}

/** Mini donut chart (SVG) */
function MiniDonut({
  breakdown,
  total,
  size = 40,
}: {
  breakdown: BreakdownEntry[];
  total: number;
  size?: number;
}) {
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - 3;
  const circumference = 2 * Math.PI * r;

  let offset = 0;
  const segments = breakdown
    .filter((b) => b.amountUsd > 0 && total > 0)
    .map((b) => {
      const pct = b.amountUsd / total;
      const len = circumference * pct;
      const seg = { ...b, len, offset, pct };
      offset += len;
      return seg;
    });

  return (
    <div
      className="relative flex-shrink-0"
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        {/* Background ring */}
        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke="rgba(0,0,0,0.04)"
          strokeWidth={5}
        />
        {/* Segments */}
        {segments.map((seg) => (
          <circle
            key={seg.asset}
            cx={cx}
            cy={cy}
            r={r}
            fill="none"
            stroke={seg.color}
            strokeWidth={5}
            strokeDasharray={`${seg.len} ${circumference - seg.len}`}
            strokeDashoffset={-seg.offset}
            strokeLinecap="butt"
          />
        ))}
      </svg>
      {/* Center text */}
      <div className="absolute inset-0 flex items-center justify-center">
        <span
          className="font-mono font-bold"
          style={{ fontSize: 8, color: "rgba(0,0,0,0.6)" }}
        >
          {formatUsdCompact(total)}
        </span>
      </div>
    </div>
  );
}

export function ProtocolRow({
  name,
  logoSrc,
  fallbackInitials,
  fallbackColor,
  meta,
  amount,
  statusText,
  breakdown,
}: ProtocolRowProps) {
  const [imgError, setImgError] = useState(false);
  const showFallback = !logoSrc || imgError;

  const total = breakdown?.reduce((s, b) => s + b.amountUsd, 0) ?? 0;

  return (
    <div
      className="flex items-center gap-3 px-3 py-2.5 transition-colors cursor-default"
      style={{ borderRadius: 4 }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLDivElement).style.backgroundColor =
          "rgba(0,0,0,0.02)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLDivElement).style.backgroundColor = "";
      }}
    >
      {/* Logo / Initials */}
      <div
        className="flex-shrink-0 flex items-center justify-center rounded-lg overflow-hidden"
        style={{ width: 28, height: 28 }}
      >
        {showFallback ? (
          <div
            className="w-full h-full flex items-center justify-center rounded-lg"
            style={{ backgroundColor: fallbackColor }}
          >
            <span
              className="font-black text-white"
              style={{ fontSize: 10, letterSpacing: "-0.02em" }}
            >
              {fallbackInitials.slice(0, 2).toUpperCase()}
            </span>
          </div>
        ) : (
          <img
            src={logoSrc}
            alt={name}
            width={28}
            height={28}
            className="w-full h-full object-contain rounded-lg"
            onError={() => setImgError(true)}
          />
        )}
      </div>

      {/* Name + meta */}
      <div className="flex-1 min-w-0">
        <div
          className="font-black text-black truncate"
          style={{ fontSize: 11 }}
        >
          {name}
        </div>
        <div
          className="truncate"
          style={{ color: "rgba(0,0,0,0.35)", fontSize: 9, fontWeight: 500 }}
        >
          {meta}
        </div>
      </div>

      {/* Mini donut or amount */}
      {breakdown && breakdown.length > 0 && total > 0 ? (
        <MiniDonut breakdown={breakdown} total={total} size={40} />
      ) : (
        <div className="flex flex-col items-end flex-shrink-0">
          {amount && (
            <span
              className="font-mono font-bold text-black"
              style={{ fontSize: 11 }}
            >
              {amount}
            </span>
          )}
          {statusText && (
            <span
              className="uppercase font-black"
              style={{
                fontSize: 8,
                letterSpacing: "0.12em",
                color: "rgba(0,0,0,0.3)",
              }}
            >
              {statusText}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
