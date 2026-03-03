import * as React from "react";

import type { GraphNode } from "@/types";
import {
  getNodeLogos,
  getProtocolLogoPath,
  hasProtocolLogo,
} from "@/lib/logos";
import { cn } from "@/lib/utils";
import { currencyFormatter } from "@/utils/formatters";
import { classifyNodeType, getNodeTypeParts } from "@/lib/nodeType";

interface TreemapTileDatum extends Record<string, unknown> {
  nodeId?: string;
  fullNode?: GraphNode;
  typeLabel?: string;
  lendingPosition?: "collateral" | "borrow";
  originalValue?: number;
  isOthers?: boolean;
  childIds?: string[];
  childCount?: number;
  isTerminal?: boolean;
  directLeavesCount?: number;
  allocations?: { id: string; name: string; value: number }[];
}

interface CustomContentProps extends Record<string, unknown> {
  root?: unknown;
  depth?: number;
  x: number;
  y: number;
  width: number;
  height: number;
  index?: number;
  payload?: TreemapTileDatum;
  colors?: unknown;
  rank?: number;
  nodeId?: string;
  fullNode?: GraphNode;
  typeLabel?: string;
  lendingPosition?: "collateral" | "borrow";
  originalValue?: number;
  isTerminal?: boolean;
  directLeavesCount?: number;
  name: string;
  value: number;
  percent: number;
  onSelect: (
    node: GraphNode,
    meta?: {
      lendingPosition?: "collateral" | "borrow";
    },
  ) => void | Promise<void>;
  onSelectOthers?: (childIds: string[]) => void;
  selectedNodeId?: string | null;
  pressedNodeId: string | null;
  onPressStart: (nodeId: string) => void;
  onPressEnd: () => void;
  lastClick: { nodeId: string; seq: number } | null;

  onHover?: (
    datum: TreemapTileDatum,
    point: { clientX: number; clientY: number },
  ) => void;
  onHoverEnd?: () => void;
}

const sanitizeSvgId = (value: string): string => {
  return value.replace(/[^a-zA-Z0-9_-]/g, "_");
};

const ellipsizeToWidth = (
  value: string,
  maxWidthPx: number,
  fontSizePx: number,
): string => {
  const approxCharWidth = fontSizePx * 0.6;
  const maxChars = Math.max(3, Math.floor(maxWidthPx / approxCharWidth));

  if (value.length <= maxChars) return value;
  if (maxChars <= 3) return value.slice(0, 1) + "…";

  return value.slice(0, maxChars - 1) + "…";
};

const estimateTextWidthPx = (value: string, fontSizePx: number): number => {
  // Simple approximation for uppercase-heavy UI labels.
  return Math.ceil(value.length * fontSizePx * 0.62);
};

const estimateBadgeTextWidthPx = (
  value: string,
  fontSizePx: number,
  letterSpacingEm: number,
): number => {
  const len = value.length;
  if (len <= 0) return 0;

  // Approximate glyph width + letter spacing between characters.
  const base = len * fontSizePx * 0.62;
  const spacing = Math.max(0, len - 1) * fontSizePx * letterSpacingEm;
  return Math.ceil(base + spacing);
};

// Squarify helper for mini-treemap layout
function squarify(
  x: number,
  y: number,
  width: number,
  height: number,
  items: { value: number; name: string; id: string }[],
): {
  x: number;
  y: number;
  width: number;
  height: number;
  name: string;
  id: string;
}[] {
  if (items.length === 0) return [];
  if (items.length === 1)
    return [{ x, y, width, height, name: items[0].name, id: items[0].id }];

  const total = items.reduce((sum, item) => sum + item.value, 0);
  let bestSplit = 1;
  let minDiff = Infinity;
  let sumLeft = 0;

  for (let i = 0; i < items.length - 1; i++) {
    sumLeft += items[i].value;
    const diff = Math.abs(sumLeft / total - 0.5);
    if (diff < minDiff) {
      minDiff = diff;
      bestSplit = i + 1;
    }
  }

  const leftItems = items.slice(0, bestSplit);
  const rightItems = items.slice(bestSplit);
  const ratio = leftItems.reduce((sum, item) => sum + item.value, 0) / total;

  if (width > height) {
    const leftWidth = width * ratio;
    return [
      ...squarify(x, y, leftWidth, height, leftItems),
      ...squarify(x + leftWidth, y, width - leftWidth, height, rightItems),
    ];
  } else {
    const leftHeight = height * ratio;
    return [
      ...squarify(x, y, width, leftHeight, leftItems),
      ...squarify(x, y + leftHeight, width, height - leftHeight, rightItems),
    ];
  }
}

export const AssetTreeMapTile = (props: Record<string, unknown>) => {
  const typed = props as CustomContentProps;
  const {
    x,
    y,
    width,
    height,
    payload,
    name,
    value,
    onSelect,
    onSelectOthers,
    selectedNodeId,
    pressedNodeId,
    onPressStart,
    onPressEnd,
    lastClick,
    onHover,
    onHoverEnd,
  } = typed;

  const [isShaking, setIsShaking] = React.useState(false);

  const dataItem = payload || typed;
  const nodeId = dataItem?.nodeId;
  const fullNode = dataItem?.fullNode;
  const isOthers = dataItem?.isOthers;
  const isTerminal = !isOthers && !!dataItem?.isTerminal;
  const directLeavesCount =
    typeof dataItem?.directLeavesCount === "number" &&
    Number.isFinite(dataItem.directLeavesCount)
      ? Math.max(0, Math.floor(dataItem.directLeavesCount))
      : null;

  const allocations = Array.isArray(dataItem?.allocations)
    ? (dataItem.allocations as TreemapTileDatum["allocations"])
    : null;
  const hasAllocations = !!allocations && allocations.length > 0;

  if (!nodeId || (!fullNode && !isOthers)) return null;

  const isSelected = selectedNodeId === nodeId;
  const isPressed = pressedNodeId === nodeId;
  const originalValue = dataItem.originalValue ?? value;
  const typeLabel =
    typeof dataItem?.typeLabel === "string" ? dataItem.typeLabel.trim() : "";

  // Refined terminal color palette - Muted Red (Clear "End of Path" signal)
  const terminalFill = "#FFF1F2"; // Rose 50
  const terminalStroke = "rgba(225, 29, 72, 0.2)"; // Rose 600 with alpha
  const terminalTextColor = "#9F1239"; // Rose 800

  // "Others" tile specific style (beige/light gray background)
  const othersFill = "#EAE5D9"; // Beige-ish gray from Image 1 / detailnodestyle.png
  const othersStroke = "#000000";

  const fill =
    isOthers || hasAllocations
      ? othersFill
      : isTerminal
        ? terminalFill
        : "#E6EBF8";
  const stroke =
    isOthers || hasAllocations
      ? othersStroke
      : isTerminal
        ? terminalStroke
        : "#000000";
  const textColor =
    isOthers || hasAllocations
      ? "#000000"
      : isTerminal
        ? terminalTextColor
        : "#000000";
  const monoFont = "'JetBrains Mono', monospace";

  const strokeDasharray = isTerminal ? "4 3" : undefined;
  const showTerminalBadge = isTerminal && width >= 80 && height >= 36;
  const showTerminalDot =
    isTerminal && !showTerminalBadge && width >= 42 && height >= 28;

  const showLeavesCount =
    !isOthers &&
    !isTerminal &&
    directLeavesCount !== null &&
    directLeavesCount > 0 &&
    width >= 90 &&
    height >= 40 &&
    !(hasAllocations && width > 150);

  const logoPaths = fullNode ? getNodeLogos(fullNode) : [];
  const showLogos = logoPaths.length > 0 && width > 60 && height > 60;

  const protocolFallbackPath =
    fullNode?.protocol && hasProtocolLogo(fullNode.protocol)
      ? getProtocolLogoPath(fullNode.protocol)
      : "";

  const clipId = `clip_${sanitizeSvgId(String(nodeId))}`;
  const patternId = `pattern_${sanitizeSvgId(String(nodeId))}`;

  const fontSize = 13;
  const horizontalPadding = 12;
  const tileInset = Math.min(
    4,
    Math.max(1, Math.floor(Math.min(width, height) * 0.04)),
  );
  const innerX = x + tileInset;
  const innerY = y + tileInset;
  const innerWidth = Math.max(0, width - tileInset * 2);
  const innerHeight = Math.max(0, height - tileInset * 2);

  const typeBadge = (() => {
    if (isOthers) return null;
    if (!typeLabel) return null;
    if (width < 140 || height < 42) return null;

    const category = classifyNodeType(
      getNodeTypeParts(fullNode?.details ?? null, typeLabel),
    );

    const colors = (() => {
      if (category === "yield-vault") {
        return {
          fill: "#ECFDF5", // emerald-50
          stroke: "#A7F3D0", // emerald-200
          text: "#047857", // emerald-700
        };
      }
      if (category === "lending") {
        return {
          fill: "#EFF6FF", // blue-50
          stroke: "#BFDBFE", // blue-200
          text: "#1D4ED8", // blue-700
        };
      }
      if (category === "staked-locked") {
        return {
          fill: "#FFFBEB", // amber-50
          stroke: "#FDE68A", // amber-200
          text: "#B45309", // amber-700
        };
      }

      return {
        fill: "rgba(0,0,0,0.02)",
        stroke: "rgba(0,0,0,0.10)",
        text: "rgba(0,0,0,0.60)",
      };
    })();

    const text = typeLabel.toUpperCase();
    const fontSizePx = 8;
    const padX = 10;
    const heightPx = 16;
    const letterSpacingEm = 0.22;
    const widthPx = Math.min(
      Math.max(
        56,
        estimateBadgeTextWidthPx(text, fontSizePx, letterSpacingEm) + padX * 2,
      ),
      Math.max(56, Math.floor(width - horizontalPadding * 2)),
    );

    return {
      text,
      fontSizePx,
      padX,
      heightPx,
      widthPx,
      letterSpacingEm,
      colors,
    };
  })();

  const headerPaddingX = 10;
  const logoSize = 18;
  const logoGap = 6;
  const headerContentX = innerX + headerPaddingX;
  const baseTextX = showLogos
    ? headerContentX + logoSize + logoGap + (logoPaths.length - 1) * 12
    : headerContentX;
  const badgeGapPx = typeBadge ? 8 : 0;

  const headerText = (() => {
    if (!hasAllocations && !isOthers) return "";
    const count =
      typeof dataItem.childCount === "number" && dataItem.childCount > 0
        ? dataItem.childCount
        : (allocations?.length ?? 0);
    return `+${count} others ${currencyFormatter.format(originalValue)}`;
  })();

  const displayText = (() => {
    if (hasAllocations || isOthers) {
      return `${headerText} ${name}`.trim();
    }
    return `${name} ${currencyFormatter.format(originalValue)}`;
  })();

  const headerBarTop = innerY + 4;
  const headerBarHeight = 24;
  const headerLineY = headerBarTop + headerBarHeight / 2;
  const labelLineY = headerLineY;

  const labelLineMaxWidth = Math.max(
    0,
    innerX + innerWidth - headerPaddingX - baseTextX,
  );

  const safeTextWidthPx = estimateTextWidthPx(displayText, fontSize);
  const badgeX = baseTextX + safeTextWidthPx + badgeGapPx;

  const resolvedTypeBadge = (() => {
    if (!typeBadge) return null;
    const maxBadgeWidth = Math.max(0, innerX + innerWidth - 8 - badgeX);
    if (maxBadgeWidth < 28) return null;

    const availableTextWidth = Math.max(0, maxBadgeWidth - typeBadge.padX * 2);
    const badgeText = ellipsizeToWidth(
      typeBadge.text,
      availableTextWidth,
      typeBadge.fontSizePx,
    );
    if (!badgeText) return null;

    const widthPx = Math.min(typeBadge.widthPx, Math.max(28, maxBadgeWidth));

    return {
      ...typeBadge,
      text: badgeText,
      widthPx,
    };
  })();

  const inlineBadgeFits = (() => {
    if (!resolvedTypeBadge) return false;
    const maxInlineWidth = Math.max(0, innerX + innerWidth - 8 - badgeX);
    return maxInlineWidth >= resolvedTypeBadge.widthPx;
  })();

  const safeLabelText = (() => {
    const reserved =
      inlineBadgeFits && resolvedTypeBadge
        ? resolvedTypeBadge.widthPx + badgeGapPx
        : 0;
    const maxTextWidth = Math.max(0, labelLineMaxWidth - reserved);
    return ellipsizeToWidth(displayText, maxTextWidth, fontSize);
  })();

  const labelTextWidthPx = estimateTextWidthPx(safeLabelText, fontSize);
  const labelBadgeX = baseTextX + labelTextWidthPx + badgeGapPx;

  const clickFlashActive = lastClick?.nodeId === nodeId;

  // Mini-treemap rendering logic (Squarify)
  // For "Others":
  // - Top bar (header)
  // - Body area filled with smaller rectangles
  const renderAllocations = () => {
    if (!hasAllocations) return null;
    if (innerWidth < 90 || innerHeight < 90) return null;

    const HEADER_HEIGHT = 28;
    const MARGIN = 6;
    const INNER_GAP = 2;

    // Area available for inner rectangles
    const availW = innerWidth - MARGIN * 2;
    const availH = innerHeight - HEADER_HEIGHT - MARGIN * 2;

    if (availW < 24 || availH < 24) return null;

    const items = allocations
      .filter((item) => Number.isFinite(item.value) && item.value > 0)
      .map((item) => ({
        id: item.id,
        name: item.name,
        value: item.value,
      }));

    if (items.length === 0) return null;

    const layouts = squarify(
      innerX + MARGIN,
      innerY + HEADER_HEIGHT + INNER_GAP,
      availW,
      availH,
      items,
    );

    return (
      <g>
        <line
          x1={innerX}
          x2={innerX + innerWidth}
          y1={innerY + HEADER_HEIGHT}
          y2={innerY + HEADER_HEIGHT}
          stroke="#000000"
          strokeWidth={1}
        />
        <rect
          x={innerX + MARGIN}
          y={innerY + HEADER_HEIGHT + INNER_GAP}
          width={availW}
          height={availH}
          style={{
            fill: "none",
            stroke: "none",
          }}
          pointerEvents="none"
        />

        {layouts.map((layout) => {
          if (layout.width < 1 || layout.height < 1) return null;

          return (
            <React.Fragment key={layout.id}>
              <rect
                x={layout.x}
                y={layout.y}
                width={layout.width}
                height={layout.height}
                style={{
                  fill: "#E6EBF8",
                  stroke: "#000000",
                  strokeWidth: 0.5,
                }}
              />
              {layout.width > 30 && layout.height > 12 && (
                <text
                  x={layout.x + 2}
                  y={layout.y + 10}
                  fontSize={layout.width > 50 ? 8 : 7}
                  fill="rgba(0,0,0,0.8)"
                  style={{ fontFamily: monoFont }}
                >
                  {ellipsizeToWidth(
                    layout.name.toUpperCase(),
                    layout.width - 4,
                    8,
                  )}
                </text>
              )}
            </React.Fragment>
          );
        })}
      </g>
    );
  };

  const handleActivate = () => {
    if (isTerminal) {
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 400);
    }

    const childIds = dataItem.childIds;
    if (isOthers && onSelectOthers && Array.isArray(childIds)) {
      onSelectOthers(childIds);
    } else if (fullNode) {
      void onSelect(fullNode, { lendingPosition: dataItem?.lendingPosition });
    }
  };

  const handleKeyDown: React.KeyboardEventHandler<SVGGElement> = (e) => {
    if (e.key !== "Enter" && e.key !== " ") return;
    e.preventDefault();
    handleActivate();
  };

  return (
    <g
      onPointerDown={() => !isTerminal && onPressStart(String(nodeId))}
      onPointerUp={onPressEnd}
      onPointerCancel={onPressEnd}
      onPointerLeave={() => {
        onPressEnd();
        onHoverEnd?.();
      }}
      onPointerMove={(e) => {
        if (!onHover) return;
        onHover(dataItem, { clientX: e.clientX, clientY: e.clientY });
      }}
      onPointerEnter={(e) => {
        if (!onHover) return;
        onHover(dataItem, { clientX: e.clientX, clientY: e.clientY });
      }}
      onClick={handleActivate}
      onKeyDown={handleKeyDown}
      className={cn("exposure-tile", isShaking && "exposure-tile-shake")}
      role="button"
      tabIndex={0}
      aria-label={String(name)}
      data-node-id={String(nodeId)}
      style={{ cursor: isTerminal ? "default" : "pointer" }}
    >
      <defs>
        <clipPath id={clipId} clipPathUnits="userSpaceOnUse">
          <rect x={innerX} y={innerY} width={innerWidth} height={innerHeight} />
        </clipPath>
        {isTerminal && (
          <pattern
            id={patternId}
            width="8"
            height="8"
            patternUnits="userSpaceOnUse"
            patternTransform="rotate(45)"
          >
            <line
              x1="0"
              y1="0"
              x2="0"
              y2="8"
              stroke="rgba(0,0,0,0.03)"
              strokeWidth="1"
            />
          </pattern>
        )}
      </defs>

      <rect
        x={innerX}
        y={innerY}
        width={innerWidth}
        height={innerHeight}
        style={{
          fill,
          stroke,
          strokeWidth: 1,
          strokeDasharray,
          strokeLinecap: "round",
          opacity: 1,
        }}
        className={
          isPressed && !isTerminal
            ? "exposure-tile-rect exposure-tile-rect--pressed"
            : "exposure-tile-rect"
        }
      />

      {isTerminal && (
        <rect
          x={innerX}
          y={innerY}
          width={innerWidth}
          height={innerHeight}
          style={{
            fill: `url(#${patternId})`,
            stroke: "none",
          }}
          pointerEvents="none"
        />
      )}

      {isSelected && !isTerminal && (
        <rect
          x={innerX}
          y={innerY}
          width={innerWidth}
          height={innerHeight}
          style={{
            fill: "rgba(0, 0, 0, 0.05)",
            stroke,
            strokeWidth: 2,
          }}
          vectorEffect="non-scaling-stroke"
        />
      )}

      {clickFlashActive && !isTerminal && (
        <rect
          key={lastClick?.seq}
          x={innerX}
          y={innerY}
          width={innerWidth}
          height={innerHeight}
          className="exposure-tile-click"
          style={{
            fill: "rgba(0, 0, 0, 0.1)",
            stroke,
            strokeWidth: 2,
          }}
          vectorEffect="non-scaling-stroke"
        />
      )}

      <g clipPath={`url(#${clipId})`}>
        {showTerminalBadge && (
          <g>
            <rect
              x={innerX + innerWidth - 40}
              y={innerY + 8}
              width={32}
              height={14}
              rx={6}
              style={{
                fill: "#FECDD3", // Rose 200
                stroke: "none",
              }}
              vectorEffect="non-scaling-stroke"
            />
            <text
              x={innerX + innerWidth - 24}
              y={innerY + 18}
              textAnchor="middle"
              fill="#9F1239" // Rose 800
              fontSize={9}
              fontWeight={800}
              style={{ fontFamily: monoFont, letterSpacing: "0.1em" }}
            >
              END
            </text>
          </g>
        )}

        {showTerminalDot && (
          <circle
            cx={innerX + innerWidth - 12}
            cy={innerY + 12}
            r={4}
            style={{
              fill: "#E11D48", // Rose 600
              stroke: "none",
            }}
            vectorEffect="non-scaling-stroke"
          />
        )}

        {showLeavesCount && (
          <g pointerEvents="none">
            <rect
              x={innerX + innerWidth - 54}
              y={innerY + 8}
              width={46}
              height={16}
              rx={8}
              style={{
                fill: "rgba(0,0,0,0.03)",
                stroke: "rgba(0,0,0,0.10)",
                strokeWidth: 1,
              }}
              vectorEffect="non-scaling-stroke"
            />
            <text
              x={innerX + innerWidth - 31}
              y={innerY + 19}
              textAnchor="middle"
              fill="rgba(0,0,0,0.65)"
              fontSize={9}
              fontWeight={900}
              style={{ fontFamily: monoFont, letterSpacing: "0.12em" }}
            >
              {directLeavesCount}
            </text>
          </g>
        )}

        {showLogos &&
          logoPaths.map((logoPath, idx) => (
            <image
              key={logoPath}
              href={logoPath}
              onError={(e) => {
                if (!protocolFallbackPath) return;
                const el = e.currentTarget;
                const alreadyApplied =
                  el.getAttribute("data-fallback-applied") === "1";
                if (alreadyApplied) return;

                const current = el.getAttribute("href") || "";
                if (current === protocolFallbackPath) return;

                el.setAttribute("data-fallback-applied", "1");
                el.setAttribute("href", protocolFallbackPath);
              }}
              x={headerContentX + idx * 12}
              y={headerLineY - 9}
              height="18"
              width="18"
              preserveAspectRatio="xMidYMid meet"
            />
          ))}

        {width > 40 && height > 20 && (
          <text
            x={baseTextX}
            y={labelLineY}
            textAnchor="start"
            dominantBaseline="middle"
            fill={textColor}
            fontSize={fontSize}
            fontWeight={700}
            style={{ fontFamily: monoFont }}
          >
            {safeLabelText}
          </text>
        )}

        {resolvedTypeBadge && inlineBadgeFits && width > 40 && height > 20 && (
          <g pointerEvents="none">
            <rect
              x={labelBadgeX}
              y={
                headerBarTop +
                (headerBarHeight - resolvedTypeBadge.heightPx) / 2
              }
              width={resolvedTypeBadge.widthPx}
              height={resolvedTypeBadge.heightPx}
              rx={resolvedTypeBadge.heightPx / 2}
              ry={resolvedTypeBadge.heightPx / 2}
              style={{
                fill: resolvedTypeBadge.colors.fill,
                stroke: resolvedTypeBadge.colors.stroke,
                strokeWidth: 1,
              }}
              vectorEffect="non-scaling-stroke"
            />
            <text
              x={labelBadgeX + resolvedTypeBadge.padX}
              y={headerLineY}
              textAnchor="start"
              dominantBaseline="middle"
              fill={resolvedTypeBadge.colors.text}
              fontSize={resolvedTypeBadge.fontSizePx}
              fontWeight={900}
              style={{
                fontFamily:
                  "ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif",
                letterSpacing: `${resolvedTypeBadge.letterSpacingEm}em`,
              }}
            >
              {resolvedTypeBadge.text}
            </text>
          </g>
        )}

        {renderAllocations()}
      </g>
    </g>
  );
};
