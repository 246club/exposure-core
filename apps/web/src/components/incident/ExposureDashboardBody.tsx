import type { ReactNode } from "react";

import type { ToxicAssetDef, VaultExposure } from "@/lib/incident/types";

import { IncidentBanner } from "./IncidentBanner";
import { PriceChart, type PriceChartAsset } from "./PriceChart";
import { BadDebtPanel, type CoveringProtocol } from "./BadDebtPanel";
import { MetricCard } from "./MetricCard";
import { ProtocolRow } from "./ProtocolRow";
import { TimelinePanel, type TimelineEntry } from "./TimelinePanel";
import { VaultTable } from "./VaultTable";
import { FollowBanner } from "./FollowBanner";
import { ToxicAssetDonut, type DonutEntry } from "./ToxicAssetDonut";
import { DistributionRadar, type RadarEntry } from "./DistributionRadar";
import { AnimatedCounter } from "./AnimatedCounter";

export interface DashboardProtocolBreakdown {
  asset: string;
  amountUsd: number;
  color: string;
}

export interface DashboardProtocolRow {
  name: string;
  logoSrc?: string;
  fallbackInitials: string;
  fallbackColor: string;
  meta: string;
  amount?: string;
  statusText?: string;
  breakdown?: DashboardProtocolBreakdown[];
}

export interface DashboardMetric {
  label: string;
  value: number;
  format?: "usd" | "number" | "percent";
}

interface ExposureDashboardBodyProps {
  banner: {
    title: string;
    description: string;
    timestamp: string;
    status: "active" | "resolved";
  };
  totalPanel: {
    title: string;
    value: number;
    subtitle: string;
    note?: string;
  };
  priceChartAssets?: PriceChartAsset[];
  debtPanel: {
    title: string;
    realizedDebt: number;
    coveredDebt: number;
    uncoveredGap: number;
    recoveryRate: number;
    coveringProtocols?: CoveringProtocol[];
    labels?: {
      realizedDebt?: string;
      coveredDebt?: string;
      uncoveredGap?: string;
      recoveryRate?: string;
    };
  };
  donutPanel: {
    title: string;
    entries: DonutEntry[];
    total: number;
  };
  curatorPanel: {
    title: string;
    content: ReactNode;
  };
  metrics: DashboardMetric[];
  protocolRadarEntries: RadarEntry[];
  chainRadarEntries: RadarEntry[];
  protocolPanel: {
    title: string;
    rows: DashboardProtocolRow[];
  };
  timelinePanel: {
    title: string;
    entries: TimelineEntry[];
  };
  vaultTablePanel: {
    title: string;
    vaults: VaultExposure[];
    toxicAssets: ToxicAssetDef[];
  };
  footer: {
    left: string;
    right: string;
  };
}

const panelHeader = (title: string) => (
  <div
    className="text-[8px] font-black tracking-[0.3em] uppercase mb-3 pb-2"
    style={{
      color: "var(--text-tertiary)",
      borderBottom: "1px solid var(--border)",
    }}
  >
    {title}
  </div>
);

export function ExposureDashboardBody({
  banner,
  totalPanel,
  priceChartAssets,
  debtPanel,
  donutPanel,
  curatorPanel,
  metrics,
  protocolRadarEntries,
  chainRadarEntries,
  protocolPanel,
  timelinePanel,
  vaultTablePanel,
  footer,
}: ExposureDashboardBodyProps) {
  return (
    <>
      <div className="max-w-[1280px] mx-auto px-6 py-6">
        <div
          className="flex flex-col"
          style={{ gap: 1, backgroundColor: "var(--border)" }}
        >
          <div
            className="px-5 py-3"
            style={{ backgroundColor: "var(--surface)" }}
          >
            <IncidentBanner
              title={banner.title}
              description={banner.description}
              timestamp={banner.timestamp}
              status={banner.status}
            />
          </div>

          <div
            className="grid grid-cols-1 md:grid-cols-2"
            style={{ gap: 1, backgroundColor: "var(--border)" }}
          >
            <div
              className="px-5 py-4"
              style={{ backgroundColor: "var(--surface)" }}
            >
              {panelHeader(totalPanel.title)}
              <div className="flex flex-col gap-1">
                <div
                  className="font-mono font-bold"
                  style={{
                    fontSize: 48,
                    letterSpacing: "-0.03em",
                    lineHeight: 1,
                    color: "var(--text-primary)",
                  }}
                >
                  <AnimatedCounter target={totalPanel.value} format="usd" />
                </div>
                <p
                  className="uppercase font-semibold"
                  style={{ fontSize: 10, color: "var(--text-tertiary)" }}
                >
                  {totalPanel.subtitle}
                </p>
                {totalPanel.note ? (
                  <p
                    className="text-xs leading-relaxed mt-2"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    {totalPanel.note}
                  </p>
                ) : null}
              </div>
            </div>

            <PriceChart assets={priceChartAssets} />
          </div>

          <div
            className="grid grid-cols-1 md:grid-cols-2"
            style={{ gap: 1, backgroundColor: "var(--border)" }}
          >
            <div
              className="px-5 py-4"
              style={{ backgroundColor: "var(--surface)" }}
            >
              {panelHeader(debtPanel.title)}
              <BadDebtPanel
                realizedDebt={debtPanel.realizedDebt}
                coveredDebt={debtPanel.coveredDebt}
                uncoveredGap={debtPanel.uncoveredGap}
                recoveryRate={debtPanel.recoveryRate}
                coveringProtocols={debtPanel.coveringProtocols}
                labels={debtPanel.labels}
              />
            </div>

            <div
              className="px-5 py-4"
              style={{ backgroundColor: "var(--surface)" }}
            >
              {panelHeader(donutPanel.title)}
              <ToxicAssetDonut
                entries={donutPanel.entries}
                total={donutPanel.total}
              />
            </div>
          </div>

          <div
            className="px-5 py-4"
            style={{ backgroundColor: "var(--surface)" }}
          >
            {panelHeader(curatorPanel.title)}
            {curatorPanel.content}
          </div>

          <div
            className="grid grid-cols-2 md:grid-cols-4"
            style={{ gap: 1, backgroundColor: "var(--border)" }}
          >
            {metrics.map((metric) => (
              <MetricCard
                key={metric.label}
                label={metric.label}
                value={metric.value}
                format={metric.format}
              />
            ))}
          </div>

          <div
            className="grid grid-cols-1 md:grid-cols-2"
            style={{ gap: 1, backgroundColor: "var(--border)" }}
          >
            <div
              className="px-5 py-4"
              style={{ backgroundColor: "var(--surface)" }}
            >
              {panelHeader("Protocols Distribution")}
              <DistributionRadar entries={protocolRadarEntries} />
            </div>
            <div
              className="px-5 py-4"
              style={{ backgroundColor: "var(--surface)" }}
            >
              {panelHeader("Chains Distribution")}
              <DistributionRadar entries={chainRadarEntries} />
            </div>
          </div>

          <div
            className="grid grid-cols-1 md:grid-cols-2"
            style={{ gap: 1, backgroundColor: "var(--border)" }}
          >
            <div
              className="px-5 py-4"
              style={{ backgroundColor: "var(--surface)" }}
            >
              {panelHeader(protocolPanel.title)}
              <div className="space-y-1">
                {protocolPanel.rows.map((row) => (
                  <ProtocolRow
                    key={row.name}
                    name={row.name}
                    logoSrc={row.logoSrc}
                    fallbackInitials={row.fallbackInitials}
                    fallbackColor={row.fallbackColor}
                    meta={row.meta}
                    amount={row.amount}
                    statusText={row.statusText}
                    breakdown={row.breakdown}
                  />
                ))}
              </div>
            </div>

            <div
              className="px-5 py-4"
              style={{ backgroundColor: "var(--surface)" }}
            >
              {panelHeader(timelinePanel.title)}
              <TimelinePanel entries={timelinePanel.entries} />
            </div>
          </div>

          <div
            className="px-5 py-4"
            style={{ backgroundColor: "var(--surface)" }}
          >
            {panelHeader(vaultTablePanel.title)}
            <VaultTable
              vaults={vaultTablePanel.vaults}
              toxicAssets={vaultTablePanel.toxicAssets}
            />
          </div>

          <div
            className="mt-px px-5 py-3 flex justify-between text-[8px] font-semibold uppercase tracking-wide"
            style={{
              backgroundColor: "var(--surface)",
              color: "var(--text-tertiary)",
            }}
          >
            <span>{footer.left}</span>
            <span>{footer.right}</span>
          </div>
        </div>
      </div>

      <FollowBanner />
    </>
  );
}
