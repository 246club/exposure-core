"use client";

import type { ReactNode } from "react";
import { FollowBanner } from "@/components/incident/FollowBanner";

interface ExposureDashboardBodyProps {
  banner: ReactNode;
  totalValue: ReactNode;
  totalMeta: ReactNode;
  priceChart: ReactNode;
  statusTitle: string;
  statusPanel: ReactNode;
  donutPanel: ReactNode;
  curatorTitle: string;
  curatorPanel: ReactNode;
  metrics: ReactNode;
  protocolDistribution: ReactNode;
  chainDistribution: ReactNode;
  protocolListTitle: string;
  protocolList: ReactNode;
  timeline: ReactNode;
  tableTitle: string;
  table: ReactNode;
  lastUpdatedLabel: string;
}

function panelHeader(title: string) {
  return (
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
}

export function ExposureDashboardBody({
  banner,
  totalValue,
  totalMeta,
  priceChart,
  statusTitle,
  statusPanel,
  donutPanel,
  curatorTitle,
  curatorPanel,
  metrics,
  protocolDistribution,
  chainDistribution,
  protocolListTitle,
  protocolList,
  timeline,
  tableTitle,
  table,
  lastUpdatedLabel,
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
            {banner}
          </div>

          <div
            className="grid grid-cols-1 md:grid-cols-2"
            style={{ gap: 1, backgroundColor: "var(--border)" }}
          >
            <div
              className="px-5 py-4"
              style={{ backgroundColor: "var(--surface)" }}
            >
              {panelHeader("Total At-Risk Allocation")}
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
                  {totalValue}
                </div>
                <p
                  className="uppercase font-semibold"
                  style={{ fontSize: 10, color: "var(--text-tertiary)" }}
                >
                  {totalMeta}
                </p>
              </div>
            </div>

            {priceChart}
          </div>

          <div
            className="grid grid-cols-1 md:grid-cols-2"
            style={{ gap: 1, backgroundColor: "var(--border)" }}
          >
            <div
              className="px-5 py-4"
              style={{ backgroundColor: "var(--surface)" }}
            >
              {panelHeader(statusTitle)}
              {statusPanel}
            </div>

            <div
              className="px-5 py-4"
              style={{ backgroundColor: "var(--surface)" }}
            >
              {panelHeader("By Toxic Asset")}
              {donutPanel}
            </div>
          </div>

          <div
            className="px-5 py-4"
            style={{ backgroundColor: "var(--surface)" }}
          >
            {panelHeader(curatorTitle)}
            {curatorPanel}
          </div>

          <div
            className="grid grid-cols-2 md:grid-cols-4"
            style={{ gap: 1, backgroundColor: "var(--border)" }}
          >
            {metrics}
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
              {protocolDistribution}
            </div>
            <div
              className="px-5 py-4"
              style={{ backgroundColor: "var(--surface)" }}
            >
              {panelHeader("Chains Distribution")}
              {chainDistribution}
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
              {panelHeader(protocolListTitle)}
              {protocolList}
            </div>

            <div
              className="px-5 py-4"
              style={{ backgroundColor: "var(--surface)" }}
            >
              {panelHeader("Timeline")}
              {timeline}
            </div>
          </div>

          <div
            className="px-5 py-4"
            style={{ backgroundColor: "var(--surface)" }}
          >
            {panelHeader(tableTitle)}
            {table}
          </div>

          <div
            className="mt-px px-5 py-3 flex justify-between text-[8px] font-semibold uppercase tracking-wide"
            style={{
              backgroundColor: "var(--surface)",
              color: "var(--text-tertiary)",
            }}
          >
            <span>
              Exposure Core · Data refreshed every 10 min · Last update:{" "}
              {lastUpdatedLabel}
            </span>
            <span>Approximate data · Verify with each protocol</span>
          </div>
        </div>
      </div>

      <FollowBanner />
    </>
  );
}
