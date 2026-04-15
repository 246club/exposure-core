"use client";

import { useState } from "react";
import { formatUsdCompact } from "@/lib/incident/format";
import {
  getCuratorDisplay,
  getCuratorIcon,
  getProtocolIcon,
} from "@/lib/incident/logos";

export interface AssetCuratorExposureItem {
  curator: string;
  protocol: string;
  vaultCount: number;
  exposureUsd: number;
}

export interface AssetCuratorBadge {
  label: string;
  value: string;
}

interface AssetCuratorExposureGridProps {
  items: AssetCuratorExposureItem[];
  badges?: AssetCuratorBadge[];
}

function CuratorLogo({
  curator,
  protocol,
}: {
  curator: string;
  protocol: string;
}) {
  const [imgError, setImgError] = useState(false);
  const iconSrc = getCuratorIcon(curator) ?? getProtocolIcon(protocol);
  const fallback = getCuratorDisplay(curator, protocol);

  if (!iconSrc || imgError) {
    return (
      <div
        className="rounded flex items-center justify-center flex-shrink-0"
        style={{
          width: 24,
          height: 24,
          backgroundColor: fallback.color,
        }}
      >
        <span className="text-white font-black" style={{ fontSize: 8 }}>
          {fallback.initials}
        </span>
      </div>
    );
  }

  return (
    <img
      src={iconSrc}
      alt={curator}
      className="flex-shrink-0 rounded"
      style={{ width: 24, height: 24 }}
      onError={() => setImgError(true)}
    />
  );
}

const DEFAULT_VISIBLE = 5;

export function AssetCuratorExposureGrid({
  items,
  badges = [],
}: AssetCuratorExposureGridProps) {
  const [expanded, setExpanded] = useState(false);

  const totalExposureUsd = items.reduce(
    (sum, item) => sum + item.exposureUsd,
    0,
  );

  if (items.length === 0) {
    return (
      <div
        className="flex items-center justify-center py-6"
        style={{ color: "var(--text-tertiary)", fontSize: 11 }}
      >
        No curator metadata available in the current snapshot
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4">
        <p
          className="font-mono font-bold"
          style={{
            fontSize: 28,
            letterSpacing: "-0.03em",
            color: "var(--text-primary)",
          }}
        >
          {formatUsdCompact(totalExposureUsd)}
        </p>
        <p
          className="uppercase font-semibold"
          style={{ fontSize: 10, color: "var(--text-tertiary)" }}
        >
          total included exposure at current snapshot
        </p>
      </div>

      {badges.length > 0 ? (
        <div className="flex gap-3 mb-4 flex-wrap">
          {badges.map((badge) => (
            <div
              key={`${badge.label}-${badge.value}`}
              className="flex items-center gap-1.5 rounded px-2 py-1"
              style={{
                backgroundColor: "var(--surface-secondary)",
                border: "1px solid var(--border)",
              }}
            >
              <span
                className="font-black uppercase"
                style={{ fontSize: 9, color: "var(--text-tertiary)" }}
              >
                {badge.label}
              </span>
              <span
                className="font-mono font-bold"
                style={{ fontSize: 11, color: "var(--text-primary)" }}
              >
                {badge.value}
              </span>
            </div>
          ))}
        </div>
      ) : null}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-1">
        {(expanded ? items : items.slice(0, DEFAULT_VISIBLE)).map((item) => {
          const pct =
            totalExposureUsd > 0
              ? (item.exposureUsd / totalExposureUsd) * 100
              : 0;
          return (
            <div
              key={`${item.curator}-${item.protocol}`}
              className="flex items-center gap-3 rounded-lg px-3 py-2"
              style={{
                backgroundColor: "var(--surface-secondary)",
                border: "1px solid var(--border)",
              }}
            >
              <CuratorLogo curator={item.curator} protocol={item.protocol} />
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2">
                  <span
                    className="font-bold truncate"
                    style={{
                      fontSize: 12,
                      color: "var(--text-primary)",
                    }}
                  >
                    {item.curator}
                  </span>
                  <span
                    className="font-mono"
                    style={{
                      fontSize: 10,
                      color: "var(--text-tertiary)",
                    }}
                  >
                    {item.vaultCount} vault{item.vaultCount !== 1 ? "s" : ""}
                  </span>
                </div>
                <div
                  className="mt-1 rounded-full overflow-hidden"
                  style={{
                    height: 4,
                    backgroundColor: "var(--border)",
                  }}
                >
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${pct}%`,
                      backgroundColor: "var(--text-secondary)",
                    }}
                  />
                </div>
              </div>
              <span
                className="font-mono font-bold flex-shrink-0"
                style={{
                  fontSize: 13,
                  color: "var(--text-primary)",
                }}
              >
                {formatUsdCompact(item.exposureUsd)}
              </span>
            </div>
          );
        })}
        {items.length > DEFAULT_VISIBLE ? (
          <button
            onClick={() => setExpanded((value) => !value)}
            className="w-full text-center py-2 rounded-lg transition-colors cursor-pointer"
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: "var(--text-secondary)",
              backgroundColor: "var(--surface-secondary)",
              border: "1px solid var(--border)",
            }}
          >
            {expanded
              ? "Show less"
              : `Show ${items.length - DEFAULT_VISIBLE} more`}
          </button>
        ) : null}
      </div>
    </div>
  );
}
