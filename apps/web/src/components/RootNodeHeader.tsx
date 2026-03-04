"use client";

import React from "react";
import {
  ChevronRight,
  TrendingUp,
  ShieldCheck,
  ExternalLink,
} from "lucide-react";
import { currencyFormatter, percentFormatter } from "@/utils/formatters";
import { GraphNode } from "@/types";
import { getNodeLogos } from "@/lib/logos";
import { getProtocolAppUrl, getProtocolAuditUrl } from "@/lib/protocol";

interface RootNodeHeaderProps {
  node: GraphNode;
  tvl?: number | null;
  onBack?: () => void;
}

export function RootNodeHeader({ node, tvl, onBack }: RootNodeHeaderProps) {
  const logos = getNodeLogos(node);

  const apyForDisplay =
    typeof node.apy === "number"
      ? node.apy > 1
        ? node.apy / 100
        : node.apy
      : null;

  const appUrl = getProtocolAppUrl(node);
  const auditUrl = getProtocolAuditUrl(node);

  return (
    <div className="flex items-start gap-3 px-3 pt-1 pb-2">
      {onBack && (
        <div className="mt-1 shrink-0">
          <button
            onClick={onBack}
            className="p-1.5 hover:bg-black/5 rounded-full transition-colors"
          >
            <ChevronRight className="w-4 h-4 rotate-180" />
          </button>
        </div>
      )}

      <div className="flex flex-col gap-2 min-w-0 flex-grow pt-1">
        {/* Row 1: Logo and Vault Name */}
        <div className="flex items-center gap-2">
          <div className="relative h-[18px] w-[30px] shrink-0">
            {logos.slice(0, 2).map((logo, idx) => (
              <img
                key={logo}
                src={logo}
                alt=""
                className="w-[18px] h-[18px] object-contain absolute top-0"
                style={{ left: `${idx * 12}px` }}
                loading="lazy"
              />
            ))}
          </div>

          <div className="min-w-0 flex items-baseline gap-2">
            <div className="font-mono text-[14px] font-black uppercase tracking-tight truncate">
              {node.name}
            </div>
            <div className="text-[9px] font-bold text-black/30 uppercase tracking-widest truncate">
              {node.protocol} • {node.chain}
            </div>
          </div>
        </div>

        {/* Row 2: TVL, APY, Curator */}
        <div className="flex flex-wrap items-center gap-y-2 gap-x-6">
          <div className="flex items-center gap-1.5">
            <div className="text-[8px] font-black text-black/20 uppercase tracking-[0.15em]">
              TVL
            </div>
            <div className="text-[11px] font-black text-black font-mono">
              {typeof tvl === "number" ? currencyFormatter.format(tvl) : "—"}
            </div>
          </div>

          {apyForDisplay !== null && (
            <div className="flex items-center gap-1.5">
              <div className="text-[8px] font-black text-black/20 uppercase tracking-[0.15em]">
                APY
              </div>
              <div className="text-[11px] font-black text-[#00A35C] font-mono">
                {percentFormatter.format(apyForDisplay)}
              </div>
            </div>
          )}

          <div className="flex items-center gap-1.5">
            <TrendingUp className="w-3 h-3 text-black/20" />
            <div className="text-[8px] font-black text-black/20 uppercase tracking-[0.15em] mr-[-2px]">
              CURATOR
            </div>
            <div className="text-[10px] font-bold text-black/60 uppercase tracking-wide">
              {node.details?.curator || "Institutional"}
            </div>
          </div>
        </div>

        {/* Row 3: Action Links (Separated below) */}
        <div className="flex items-center gap-2">
          {appUrl && (
            <a
              href={appUrl}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 px-2.5 py-1 bg-black text-white text-[8px] font-black uppercase tracking-wider rounded-full hover:bg-black/80 transition-colors"
            >
              <ExternalLink className="w-2.5 h-2.5" />
              Protocol
            </a>
          )}
          {auditUrl && (
            <a
              href={auditUrl}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 px-2.5 py-1 border border-black/10 bg-white text-[8px] font-black uppercase tracking-wider rounded-full hover:bg-black/[0.02] transition-colors text-black/60"
            >
              <ShieldCheck className="w-2.5 h-2.5" />
              Audit
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
