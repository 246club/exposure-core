import type { VaultExposure, ToxicAssetDef } from "@/lib/incident/types";
import { formatUsdCompact } from "@/lib/incident/format";
import { StatusBadge } from "./StatusBadge";
import { ExposureBar } from "./ExposureBar";

interface VaultHeroProps {
  vault: VaultExposure;
  toxicAssets: ToxicAssetDef[];
}

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function exposureColor(pct: number): string {
  if (pct === 0) return "#22c55e";
  if (pct < 0.05) return "#f59e0b";
  return "#ef4444";
}

export function VaultHero({ vault, toxicAssets }: VaultHeroProps) {
  const isPending = vault.status === "pending";
  const pctDisplay = (vault.exposurePct * 100).toFixed(1);
  const color = exposureColor(vault.exposurePct);

  return (
    <div className="py-12 md:py-16">
      {/* Vault name */}
      <h1 className="text-3xl md:text-4xl font-bold text-white mb-3">
        {vault.vault.name}
      </h1>

      {/* Protocol + chain badges */}
      <div className="flex flex-wrap items-center gap-2 mb-2">
        <span
          className="text-sm capitalize"
          style={{ color: "rgba(255,255,255,0.50)" }}
        >
          {capitalize(vault.vault.protocol)}
        </span>
        {vault.vault.chains.map((chain) => (
          <span
            key={chain}
            className="rounded-full px-2 py-0.5 text-xs font-mono uppercase"
            style={{
              backgroundColor: "rgba(255,255,255,0.08)",
              color: "rgba(255,255,255,0.50)",
            }}
          >
            {chain}
          </span>
        ))}
      </div>

      {/* Curator */}
      {vault.vault.curator && (
        <p className="text-sm mb-4" style={{ color: "rgba(255,255,255,0.50)" }}>
          Curated by {vault.vault.curator}
        </p>
      )}

      {/* Status badge */}
      <div className="mb-8">
        <StatusBadge status={vault.vault.status} />
      </div>

      {/* Exposure metrics or pending state */}
      {isPending ? (
        <div
          className="rounded-lg px-6 py-8 text-center"
          style={{
            backgroundColor: "rgba(255,255,255,0.02)",
            border: "1px solid rgba(255,255,255,0.06)",
          }}
        >
          <p style={{ color: "rgba(255,255,255,0.35)" }} className="text-sm">
            Data pending
          </p>
        </div>
      ) : (
        <div>
          {/* Large exposure percentage */}
          <div
            className="text-5xl md:text-7xl font-mono font-bold mb-1"
            style={{ color }}
          >
            {pctDisplay}%
          </div>
          <p
            className="text-sm mb-6"
            style={{ color: "rgba(255,255,255,0.35)" }}
          >
            at-risk allocation
          </p>

          {/* Exposure bar */}
          <ExposureBar
            breakdown={vault.breakdown}
            toxicAssets={toxicAssets}
            className="mb-2"
          />

          {/* Total allocation */}
          <p className="text-sm" style={{ color: "rgba(255,255,255,0.50)" }}>
            of {formatUsdCompact(vault.totalAllocationUsd)} total allocation
          </p>
        </div>
      )}
    </div>
  );
}
