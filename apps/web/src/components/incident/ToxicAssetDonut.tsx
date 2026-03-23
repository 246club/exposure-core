"use client";

import { useState } from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { formatUsdCompact } from "@/lib/incident/format";

export interface DonutEntry {
  symbol: string;
  exposureUsd: number;
  color: string;
  iconPath: string | null;
}

interface ToxicAssetDonutProps {
  entries: DonutEntry[];
  total: number;
}

function LegendIcon({
  iconPath,
  color,
  symbol,
}: {
  iconPath: string | null;
  color: string;
  symbol: string;
}) {
  const [imgError, setImgError] = useState(false);

  if (iconPath && !imgError) {
    return (
      <img
        src={iconPath}
        alt={symbol}
        width={16}
        height={16}
        className="w-4 h-4 rounded-full flex-shrink-0"
        onError={() => setImgError(true)}
      />
    );
  }

  return (
    <div
      className="w-4 h-4 rounded-full flex-shrink-0"
      style={{ backgroundColor: color }}
    />
  );
}

export function ToxicAssetDonut({ entries, total }: ToxicAssetDonutProps) {
  if (entries.length === 0) {
    return (
      <span
        className="font-mono"
        style={{ fontSize: 10, color: "rgba(0,0,0,0.25)" }}
      >
        No data
      </span>
    );
  }

  return (
    <div className="flex items-center gap-6">
      {/* Donut */}
      <div className="relative w-[100px] h-[100px] flex-shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={entries}
              dataKey="exposureUsd"
              nameKey="symbol"
              cx="50%"
              cy="50%"
              innerRadius={28}
              outerRadius={50}
              paddingAngle={1}
              strokeWidth={0}
            >
              {entries.map((entry) => (
                <Cell key={entry.symbol} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              wrapperStyle={{ zIndex: 10 }}
              content={({ payload }) => {
                if (!payload?.[0]) return null;
                const d = payload[0].payload as DonutEntry;
                const pct =
                  total > 0 ? ((d.exposureUsd / total) * 100).toFixed(1) : "0";
                return (
                  <div
                    style={{
                      backgroundColor: "#fff",
                      border: "1px solid rgba(0,0,0,0.08)",
                      borderRadius: 6,
                      padding: "6px 10px",
                      fontSize: 11,
                      boxShadow: "0 4px 12px rgba(0,0,0,0.12)",
                    }}
                  >
                    <div style={{ fontWeight: 700 }}>{d.symbol}</div>
                    <div style={{ color: "rgba(0,0,0,0.5)" }}>
                      {formatUsdCompact(d.exposureUsd)} ({pct}%)
                    </div>
                  </div>
                );
              }}
            />
          </PieChart>
        </ResponsiveContainer>
        {/* Center label */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="flex flex-col items-center justify-center">
            <span className="font-mono text-[11px] font-bold leading-tight">
              {formatUsdCompact(total)}
            </span>
            <span className="text-[7px] text-black/25 uppercase tracking-widest">
              Total
            </span>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-col justify-center gap-2">
        {entries.map((entry) => {
          const pct =
            total > 0 ? ((entry.exposureUsd / total) * 100).toFixed(1) : "0";
          return (
            <div key={entry.symbol} className="flex items-center gap-2">
              <LegendIcon
                iconPath={entry.iconPath}
                color={entry.color}
                symbol={entry.symbol}
              />
              <span
                className="font-black uppercase"
                style={{
                  fontSize: 9,
                  color: "rgba(0,0,0,0.65)",
                  lineHeight: 1,
                }}
              >
                {entry.symbol}
              </span>
              <span
                className="font-mono"
                style={{
                  fontSize: 9,
                  color: "rgba(0,0,0,0.35)",
                  lineHeight: 1,
                }}
              >
                {formatUsdCompact(entry.exposureUsd)} ({pct}%)
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
