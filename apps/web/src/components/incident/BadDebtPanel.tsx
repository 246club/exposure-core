"use client";

import { formatUsdCompact } from "@/lib/incident/format";

interface BadDebtPanelProps {
  realizedDebt: number;
  coveredDebt: number;
  uncoveredGap: number;
  recoveryRate: number;
  coveringProtocolCount?: number;
}

function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}

export function BadDebtPanel({
  realizedDebt,
  coveredDebt,
  uncoveredGap,
  recoveryRate,
  coveringProtocolCount = 0,
}: BadDebtPanelProps) {
  return (
    <div
      className="grid grid-cols-2"
      style={{ gap: 1, backgroundColor: "rgba(0,0,0,0.05)" }}
    >
      {/* Realized debt — red tint */}
      <div
        className="bg-white p-4"
        style={{ borderTop: "2px solid rgba(225,29,72,0.20)" }}
      >
        <p
          className="uppercase font-black mb-1"
          style={{
            fontSize: 8,
            letterSpacing: "0.2em",
            color: "rgba(0,0,0,0.25)",
          }}
        >
          Realized Debt
        </p>
        <p
          className="font-mono font-bold tracking-tight"
          style={{ fontSize: 20, color: "#E11D48" }}
        >
          {formatUsdCompact(realizedDebt)}
        </p>
      </div>

      {/* Covered debt — green tint */}
      <div
        className="bg-white p-4"
        style={{ borderTop: "2px solid rgba(0,163,92,0.20)" }}
      >
        <p
          className="uppercase font-black mb-1"
          style={{
            fontSize: 8,
            letterSpacing: "0.2em",
            color: "rgba(0,0,0,0.25)",
          }}
        >
          Covered / Promised
        </p>
        {coveredDebt > 0 ? (
          <p
            className="font-mono font-bold tracking-tight"
            style={{ fontSize: 20, color: "#00A35C" }}
          >
            {formatUsdCompact(coveredDebt)}
          </p>
        ) : coveringProtocolCount > 0 ? (
          <p
            className="font-mono font-bold tracking-tight"
            style={{ fontSize: 20, color: "#00A35C" }}
          >
            {coveringProtocolCount} protocol
            {coveringProtocolCount !== 1 ? "s" : ""}
          </p>
        ) : (
          <p
            className="font-mono font-bold tracking-tight"
            style={{ fontSize: 20, color: "#00A35C" }}
          >
            $0
          </p>
        )}
      </div>

      {/* Uncovered gap — neutral */}
      <div className="bg-white p-4">
        <p
          className="uppercase font-black mb-1"
          style={{
            fontSize: 8,
            letterSpacing: "0.2em",
            color: "rgba(0,0,0,0.25)",
          }}
        >
          Uncovered Gap
        </p>
        <p
          className="font-mono font-bold text-black tracking-tight"
          style={{ fontSize: 20 }}
        >
          {formatUsdCompact(uncoveredGap)}
        </p>
      </div>

      {/* Recovery rate — neutral */}
      <div className="bg-white p-4">
        <p
          className="uppercase font-black mb-1"
          style={{
            fontSize: 8,
            letterSpacing: "0.2em",
            color: "rgba(0,0,0,0.25)",
          }}
        >
          Recovery Rate
        </p>
        <p
          className="font-mono font-bold text-black tracking-tight"
          style={{ fontSize: 20 }}
        >
          {formatPercent(recoveryRate)}
        </p>
      </div>
    </div>
  );
}
