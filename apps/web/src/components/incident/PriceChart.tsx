"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

export interface PriceChartAsset {
  id: string;
  symbol: string;
  color: string;
  peg: number | null;
}

const DEFAULT_ASSETS: PriceChartAsset[] = [
  { id: "resolv-usr", symbol: "USR", color: "#c4daff", peg: 1.0 },
  { id: "resolv-wstusr", symbol: "wstUSR", color: "#5792ff", peg: null },
  { id: "resolv-rlp", symbol: "RLP", color: "#e89220", peg: null },
];

const TIME_RANGES = ["1D", "7D", "30D"] as const;
type TimeRange = (typeof TIME_RANGES)[number];

const RANGE_DAYS: Record<TimeRange, number> = {
  "1D": 1,
  "7D": 7,
  "30D": 30,
};

interface PricePoint {
  timestamp: number;
  price: number;
}

type PriceData = Record<string, PricePoint[]>;

export function PriceChart({
  assets = DEFAULT_ASSETS,
}: {
  assets?: PriceChartAsset[];
}) {
  const normalizedAssets = assets.length > 0 ? assets : DEFAULT_ASSETS;
  const [data, setData] = useState<PriceData>(() =>
    Object.fromEntries(normalizedAssets.map((asset) => [asset.symbol, []])),
  );
  const [activeAsset, setActiveAsset] = useState<string>(
    normalizedAssets[0]?.symbol ?? DEFAULT_ASSETS[0].symbol,
  );
  const [activeRange, setActiveRange] = useState<TimeRange>("7D");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    setData(
      Object.fromEntries(normalizedAssets.map((asset) => [asset.symbol, []])),
    );
    setActiveAsset(normalizedAssets[0]?.symbol ?? DEFAULT_ASSETS[0].symbol);
    setActiveRange("7D");
    setLoading(true);
    setError(false);
  }, [normalizedAssets]);

  useEffect(() => {
    const controller = new AbortController();

    async function fetchAll() {
      try {
        const results = await Promise.all(
          normalizedAssets.map(async (asset) => {
            const res = await fetch(
              `https://api.coingecko.com/api/v3/coins/${asset.id}/market_chart?vs_currency=usd&days=30`,
              { signal: controller.signal },
            );
            if (!res.ok) throw new Error(`CoinGecko ${res.status}`);

            const json = await res.json();
            if (!Array.isArray(json.prices)) {
              throw new Error("Unexpected response");
            }

            const points: PricePoint[] = json.prices.map(
              ([timestamp, price]: [number, number]) => ({
                timestamp,
                price,
              }),
            );

            return { symbol: asset.symbol, points };
          }),
        );

        const nextData: PriceData = {};
        for (const result of results) {
          nextData[result.symbol] = result.points;
        }
        setData(nextData);
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          console.error("Failed to fetch price data:", err);
          if (!controller.signal.aborted) setError(true);
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    void fetchAll();

    return () => controller.abort();
  }, [normalizedAssets]);

  const assetConfig =
    normalizedAssets.find((asset) => asset.symbol === activeAsset) ??
    normalizedAssets[0] ??
    DEFAULT_ASSETS[0];
  const assetData = data[activeAsset] ?? [];

  const filtered = useMemo(() => {
    const cutoff = Date.now() - RANGE_DAYS[activeRange] * 24 * 60 * 60 * 1000;
    return assetData.filter((point) => point.timestamp >= cutoff);
  }, [assetData, activeRange]);

  const { currentPrice, priceChange24h } = useMemo(() => {
    if (assetData.length === 0) return { currentPrice: 0, priceChange24h: 0 };

    const price = assetData[assetData.length - 1].price;
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
    const dayAgoPoint = assetData.find((point) => point.timestamp >= oneDayAgo);
    const change =
      dayAgoPoint && dayAgoPoint.price > 0
        ? ((price - dayAgoPoint.price) / dayAgoPoint.price) * 100
        : 0;

    return { currentPrice: price, priceChange24h: change };
  }, [assetData]);

  const isDown = priceChange24h < 0;
  const changeColor = isDown ? "#E11D48" : "#00A35C";
  const changeSign = isDown ? "" : "+";

  const yDomain = useMemo(() => {
    if (filtered.length === 0) return [0, 1.05] as [number, number];

    const prices = filtered.map((point) => point.price);
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const padding = (max - min) * 0.1 || 0.01;

    return [Math.max(0, min - padding), max + padding] as [number, number];
  }, [filtered]);

  return (
    <div
      className="px-5 py-4 flex flex-col"
      style={{ backgroundColor: "var(--surface)" }}
    >
      <p
        className="uppercase font-black mb-2"
        style={{
          fontSize: 8,
          letterSpacing: "0.2em",
          color: "var(--text-tertiary)",
        }}
      >
        Token Prices
      </p>

      <div className="flex items-center gap-1 mb-3 flex-wrap">
        {normalizedAssets.map((asset) => {
          const active = asset.symbol === activeAsset;
          return (
            <button
              key={`${asset.id}-${asset.symbol}`}
              onClick={() => setActiveAsset(asset.symbol)}
              className="rounded-full transition-colors select-none cursor-pointer"
              style={{
                padding: "3px 10px",
                backgroundColor: active ? asset.color : "transparent",
                color: active ? "#000" : "var(--text-secondary)",
                fontSize: 10,
                fontWeight: 900,
                letterSpacing: "0.06em",
                border: active ? "none" : "1px solid var(--border)",
              }}
            >
              {asset.symbol}
            </button>
          );
        })}
      </div>

      {!loading && assetData.length > 0 && (
        <div className="flex items-baseline gap-2 mb-3">
          <span
            className="font-mono font-bold"
            style={{
              fontSize: 28,
              letterSpacing: "-0.03em",
              color: "var(--text-primary)",
            }}
          >
            ${currentPrice.toFixed(4)}
          </span>
          <span
            className="font-mono font-bold"
            style={{ fontSize: 13, color: changeColor }}
          >
            {isDown ? "▼" : "▲"} {changeSign}
            {priceChange24h.toFixed(2)}%
          </span>
          {assetConfig.peg !== null && (
            <span
              className="font-mono"
              style={{ fontSize: 10, color: "var(--text-tertiary)" }}
            >
              peg: ${assetConfig.peg.toFixed(2)}
            </span>
          )}
        </div>
      )}

      <div className="flex-1" style={{ minHeight: 120 }}>
        {loading ? (
          <div
            className="flex items-center justify-center h-full"
            style={{ color: "var(--text-tertiary)", fontSize: 11 }}
          >
            Loading…
          </div>
        ) : error ? (
          <div
            className="flex items-center justify-center h-full"
            style={{ color: "var(--text-tertiary)", fontSize: 11 }}
          >
            Price data unavailable
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={120}>
            <AreaChart data={filtered}>
              <defs>
                <linearGradient
                  id={`gradient-${activeAsset}`}
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop
                    offset="0%"
                    stopColor={assetConfig.color}
                    stopOpacity={0.15}
                  />
                  <stop
                    offset="100%"
                    stopColor={assetConfig.color}
                    stopOpacity={0}
                  />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="timestamp"
                tickFormatter={(timestamp: number) => {
                  const date = new Date(timestamp);
                  return activeRange === "1D"
                    ? date.toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : date.toLocaleDateString([], {
                        month: "short",
                        day: "numeric",
                      });
                }}
                tick={{ fontSize: 9, fill: "var(--text-tertiary)" }}
                axisLine={false}
                tickLine={false}
                minTickGap={40}
              />
              <YAxis
                domain={yDomain}
                tick={{ fontSize: 9, fill: "var(--text-tertiary)" }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(value: number) => `$${value.toFixed(2)}`}
                width={45}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "var(--surface)",
                  border: "1px solid var(--border)",
                  borderRadius: 6,
                  fontSize: 11,
                  padding: "6px 10px",
                }}
                labelFormatter={(timestamp) =>
                  new Date(timestamp as number).toLocaleString([], {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                }
                formatter={(value) => [
                  `$${(value as number).toFixed(4)}`,
                  activeAsset,
                ]}
              />
              <Area
                type="monotone"
                dataKey="price"
                stroke={assetConfig.color}
                strokeWidth={1.5}
                fill={`url(#gradient-${activeAsset})`}
                dot={false}
                activeDot={{ r: 3, fill: assetConfig.color }}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="flex items-center gap-1 mt-2">
        {TIME_RANGES.map((range) => {
          const active = range === activeRange;
          return (
            <button
              key={range}
              onClick={() => setActiveRange(range)}
              className="rounded-full transition-colors select-none cursor-pointer"
              style={{
                padding: "3px 10px",
                backgroundColor: active ? "var(--text-primary)" : "transparent",
                color: active ? "var(--surface)" : "var(--text-secondary)",
                fontSize: 9,
                fontWeight: 900,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                border: active ? "none" : "1px solid var(--border)",
              }}
            >
              {range}
            </button>
          );
        })}
      </div>
    </div>
  );
}
