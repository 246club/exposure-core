"use client";

import React, { useMemo, useState, useEffect, useCallback } from "react";
import {
  Stage,
  Layer,
  Rect,
  Text,
  Group,
  Image as KonvaImage,
} from "react-konva";
import type { KonvaEventObject } from "konva/lib/Node";
import type { SceneContext } from "konva/lib/Context";
import * as d3 from "d3-hierarchy";
import useImage from "use-image";
import { GraphNode } from "@/types";
import { currencyFormatter } from "@/utils/formatters";
import { getNodeLogos } from "@/lib/logos";

interface TreemapTileDatum {
  name: string;
  value: number;
  originalValue: number;
  percent: number;
  nodeId: string;
  fullNode?: GraphNode;
  lendingPosition?: "collateral" | "borrow";
  isTerminal?: boolean;
  typeLabel?: string;
  isVault?: boolean;
  directLeavesCount?: number;
  allocations?: { id: string; name: string; value: number }[];
  isOthers?: boolean;
  childIds?: string[];
  childCount?: number;
}

interface AssetTreeMapKonvaProps {
  data: TreemapTileDatum[];
  width: number;
  height: number;
  onSelect: (
    node: GraphNode,
    meta?: { lendingPosition?: "collateral" | "borrow" },
  ) => void;
  onSelectOthers?: (childIds: string[]) => void;
  selectedNodeId?: string | null;
  pressedNodeId: string | null;
  onPressStart: (nodeId: string) => void;
  onPressEnd: () => void;
  lastClick: { nodeId: string; seq: number } | null;
  onHover: (
    datum: TreemapTileDatum,
    point: { clientX: number; clientY: number },
  ) => void;
  onHoverEnd: () => void;
}

const TILE_STYLE = {
  fontFamily: "'JetBrains Mono', monospace",
  fontSize: 11,
  colors: {
    othersFill: "#EAE5D9",
    terminalFill: "#FFF1F2",
    defaultFill: "#E6EBF8",
    defaultText: "#000000",
    terminalText: "#9F1239",
    terminalStroke: "rgba(225, 29, 72, 0.5)",
    selectionFill: "rgba(0, 0, 0, 0.08)",
    innerBorder: "#000000",
    innerFill: "#E6EBF8",
    innerText: "rgba(0,0,0,0.6)",
  },
  header: {
    min: 16,
    max: 26,
    ratio: 0.2,
    fallback: 20,
  },
  logo: {
    size: 16,
    step: 12,
    gutter: 12,
    maxCount: 3,
    minWidth: 60,
    minHeight: 50,
  },
  padding: {
    tileInset: 1,
    textX: 8,
    inner: 6,
    innerTextInset: 24,
  },
  thresholds: {
    labelWidth: 40,
    labelHeight: 20,
    minTextWidth: 28,
    innerWidth: 80,
    innerHeight: 80,
  },
  terminalDash: [4, 3],
};

const SR_ONLY_STYLE: React.CSSProperties = {
  position: "absolute",
  width: 1,
  height: 1,
  padding: 0,
  margin: -1,
  overflow: "hidden",
  clip: "rect(0 0 0 0)",
  border: 0,
  whiteSpace: "nowrap",
};

const getTileLabel = (data: TreemapTileDatum) => {
  const isOthers = data.isOthers;
  const isVault = !!data.isVault;
  const hasAllocations = !!data.allocations && data.allocations.length > 0;
  return isOthers || hasAllocations || isVault
    ? `${data.name} +${data.childCount || data.allocations?.length || 0} ${currencyFormatter.format(data.originalValue)}`
    : `${data.name} ${currencyFormatter.format(data.originalValue)}`;
};

const AssetLogo = React.memo(
  ({
    url,
    x,
    y,
    size,
  }: {
    url: string;
    x: number;
    y: number;
    size: number;
  }) => {
    const [image] = useImage(url);
    if (!image) return null;
    return <KonvaImage image={image} x={x} y={y} width={size} height={size} />;
  },
);

AssetLogo.displayName = "AssetLogo";

const TreemapTileKonva = React.memo(
  ({
    node,
    onSelect,
    onSelectOthers,
    selectedNodeId,
    pressedNodeId,
    onPressStart,
    onPressEnd,
    lastClick,
    onHover,
    onHoverEnd,
  }: {
    node: d3.HierarchyRectangularNode<TreemapTileDatum>;
    onSelect: (
      node: GraphNode,
      meta?: { lendingPosition?: "collateral" | "borrow" },
    ) => void;
    onSelectOthers?: (childIds: string[]) => void;
    selectedNodeId?: string | null;
    pressedNodeId: string | null;
    onPressStart: (nodeId: string) => void;
    onPressEnd: () => void;
    lastClick: { nodeId: string; seq: number } | null;
    onHover: (
      datum: TreemapTileDatum,
      point: { clientX: number; clientY: number },
    ) => void;
    onHoverEnd: () => void;
  }) => {
    const { x0, y0, x1, y1, data } = node;

    // All dimensions are rounded to ensure 1px alignment.
    // We offset everything by +1, +1 to create the top and left 1px border.
    const x = Math.round(x0) + TILE_STYLE.padding.tileInset;
    const y = Math.round(y0) + TILE_STYLE.padding.tileInset;
    const width = Math.round(x1) - Math.round(x0);
    const height = Math.round(y1) - Math.round(y0);

    const nodeId = data.nodeId;
    const isSelected =
      selectedNodeId === nodeId || lastClick?.nodeId === nodeId;
    const isPressed = pressedNodeId === nodeId;
    const isOthers = data.isOthers;
    const isVault = !!data.isVault;
    const isTerminal = !isOthers && !!data.isTerminal;
    const hasAllocations = !!data.allocations && data.allocations.length > 0;

    const fill =
      isOthers || isVault || hasAllocations
        ? TILE_STYLE.colors.othersFill
        : isTerminal
          ? TILE_STYLE.colors.terminalFill
          : TILE_STYLE.colors.defaultFill;
    const stroke = isTerminal
      ? TILE_STYLE.colors.terminalStroke
      : TILE_STYLE.colors.defaultText;
    const textColor = isTerminal
      ? TILE_STYLE.colors.terminalText
      : TILE_STYLE.colors.defaultText;

    const headerHeight =
      isOthers || hasAllocations || isVault
        ? Math.min(
            TILE_STYLE.header.max,
            Math.max(
              TILE_STYLE.header.min,
              Math.floor(height * TILE_STYLE.header.ratio),
            ),
          )
        : 0;

    const logoPaths = data.fullNode ? getNodeLogos(data.fullNode) : [];
    const logoCount = Math.min(logoPaths.length, TILE_STYLE.logo.maxCount);
    const logoInlineWidth = logoCount
      ? logoCount * TILE_STYLE.logo.step + TILE_STYLE.logo.gutter
      : 0;
    const inlineMinWidth =
      TILE_STYLE.padding.textX +
      logoInlineWidth +
      TILE_STYLE.thresholds.minTextWidth;
    const canShowInline =
      width > Math.max(TILE_STYLE.thresholds.labelWidth, inlineMinWidth) &&
      height > TILE_STYLE.thresholds.labelHeight;
    const showLogos =
      canShowInline &&
      logoCount > 0 &&
      width > TILE_STYLE.logo.minWidth &&
      height > TILE_STYLE.logo.minHeight;

    const label = getTileLabel(data);

    const fontSize = TILE_STYLE.fontSize;
    const textX = showLogos
      ? TILE_STYLE.padding.textX +
        logoCount * TILE_STYLE.logo.step +
        TILE_STYLE.logo.gutter
      : TILE_STYLE.padding.textX;
    const textWidth = Math.max(0, width - TILE_STYLE.padding.textX - textX);

    const handleClick = useCallback(() => {
      if (isOthers && onSelectOthers && data.childIds) {
        onSelectOthers(data.childIds);
      } else if (data.fullNode) {
        onSelect(data.fullNode, { lendingPosition: data.lendingPosition });
      }
    }, [isOthers, onSelectOthers, data, onSelect]);

    const handlePointerMove = useCallback(
      (e: KonvaEventObject<MouseEvent>) => {
        onHover(data, { clientX: e.evt.clientX, clientY: e.evt.clientY });
      },
      [data, onHover],
    );

    return (
      <Group
        x={x}
        y={y}
        onClick={handleClick}
        onTap={handleClick}
        onMouseDown={() => !isTerminal && onPressStart(nodeId)}
        onMouseUp={onPressEnd}
        onMouseEnter={handlePointerMove}
        onMouseMove={handlePointerMove}
        onMouseLeave={onHoverEnd}
      >
        <Rect
          width={Math.max(0, width - TILE_STYLE.padding.tileInset)}
          height={Math.max(0, height - TILE_STYLE.padding.tileInset)}
          fill={fill}
          opacity={isPressed || isSelected ? 0.8 : 1}
        />
        {isSelected && (
          <Rect
            width={Math.max(0, width - TILE_STYLE.padding.tileInset)}
            height={Math.max(0, height - TILE_STYLE.padding.tileInset)}
            fill={TILE_STYLE.colors.selectionFill}
            listening={false}
          />
        )}

        {canShowInline && (
          <Group
            clipFunc={(ctx: SceneContext) => {
              ctx.rect(
                0,
                0,
                width - TILE_STYLE.padding.tileInset,
                height - TILE_STYLE.padding.tileInset,
              );
            }}
          >
            {showLogos &&
              logoPaths
                .slice(0, TILE_STYLE.logo.maxCount)
                .map((path, idx) => (
                  <AssetLogo
                    key={path}
                    url={path}
                    x={TILE_STYLE.padding.textX + idx * TILE_STYLE.logo.step}
                    y={
                      (headerHeight || TILE_STYLE.header.fallback) / 2 -
                      TILE_STYLE.logo.size / 2
                    }
                    size={TILE_STYLE.logo.size}
                  />
                ))}
            <Text
              text={label}
              x={textX}
              y={
                (headerHeight || TILE_STYLE.header.fallback) / 2 - fontSize / 2
              }
              width={textWidth}
              ellipsis
              wrap="none"
              fontSize={fontSize}
              fontFamily={TILE_STYLE.fontFamily}
              fill={textColor}
              fontStyle="bold"
              listening={false}
            />
          </Group>
        )}

        {(hasAllocations || isVault) &&
          width > TILE_STYLE.thresholds.innerWidth &&
          height > TILE_STYLE.thresholds.innerHeight && (
            <Group
              x={TILE_STYLE.padding.inner}
              y={headerHeight + TILE_STYLE.padding.inner}
            >
              {/* Sharp 1px black border using the gutter technique */}
              <Rect
                width={Math.max(0, width - TILE_STYLE.padding.inner * 2)}
                height={Math.max(
                  0,
                  height - headerHeight - TILE_STYLE.padding.inner * 2,
                )}
                fill={TILE_STYLE.colors.innerBorder}
                listening={false}
              />
              <Rect
                x={TILE_STYLE.padding.tileInset}
                y={TILE_STYLE.padding.tileInset}
                width={Math.max(
                  0,
                  width -
                    TILE_STYLE.padding.inner * 2 -
                    TILE_STYLE.padding.tileInset * 2,
                )}
                height={Math.max(
                  0,
                  height -
                    headerHeight -
                    TILE_STYLE.padding.inner * 2 -
                    TILE_STYLE.padding.tileInset * 2,
                )}
                fill={TILE_STYLE.colors.innerFill}
                listening={false}
              />
              {data.allocations && data.allocations.length > 0 && (
                <Text
                  text={`+${data.allocations.length} OTHERS`}
                  x={TILE_STYLE.padding.inner}
                  y={TILE_STYLE.header.min - fontSize / 2}
                  width={Math.max(0, width - TILE_STYLE.padding.innerTextInset)}
                  ellipsis
                  fontSize={fontSize}
                  fontFamily={TILE_STYLE.fontFamily}
                  fill={TILE_STYLE.colors.innerText}
                  fontStyle="bold"
                  listening={false}
                />
              )}
            </Group>
          )}

        {isTerminal && (
          <Rect
            width={Math.max(0, width - TILE_STYLE.padding.tileInset)}
            height={Math.max(0, height - TILE_STYLE.padding.tileInset)}
            stroke={stroke}
            strokeWidth={1}
            dash={TILE_STYLE.terminalDash}
            listening={false}
          />
        )}
      </Group>
    );
  },
);

TreemapTileKonva.displayName = "TreemapTileKonva";

export function AssetTreeMapKonva({
  data,
  width,
  height,
  onSelect,
  onSelectOthers,
  selectedNodeId,
  pressedNodeId,
  onPressStart,
  onPressEnd,
  lastClick,
  onHover,
  onHoverEnd,
}: AssetTreeMapKonvaProps) {
  const root = useMemo(() => {
    const rootData: TreemapTileDatum & { children: TreemapTileDatum[] } = {
      name: "root",
      value: 0,
      originalValue: 0,
      percent: 0,
      nodeId: "root",
      children: data,
    };
    const hierarchy = d3
      .hierarchy<TreemapTileDatum>(rootData)
      .sum((d) => d.value)
      .sort((a, b) => (b.value || 0) - (a.value || 0));

    return (
      d3
        .treemap<TreemapTileDatum>()
        // Size is reduced by 1 to ensure a 1px gap at the right and bottom edges
        .size([width - 1, height - 1])
        .padding(0)
        .round(false)(hierarchy)
    );
  }, [data, width, height]);

  const [dpr, setDpr] = useState(1);
  useEffect(() => {
    setDpr(window.devicePixelRatio || 1);
  }, []);

  const tiles = useMemo(() => {
    return root.children?.map((node, i) => (
      <TreemapTileKonva
        key={(node.data as TreemapTileDatum).nodeId || i}
        node={node as d3.HierarchyRectangularNode<TreemapTileDatum>}
        onSelect={onSelect}
        onSelectOthers={onSelectOthers}
        selectedNodeId={selectedNodeId}
        pressedNodeId={pressedNodeId}
        onPressStart={onPressStart}
        onPressEnd={onPressEnd}
        lastClick={lastClick}
        onHover={onHover}
        onHoverEnd={onHoverEnd}
      />
    ));
  }, [
    root,
    onSelect,
    onSelectOthers,
    selectedNodeId,
    pressedNodeId,
    onPressStart,
    onPressEnd,
    lastClick,
    onHover,
    onHoverEnd,
  ]);

  const handleTileAction = useCallback(
    (datum: TreemapTileDatum) => {
      if (datum.isOthers && onSelectOthers && datum.childIds) {
        onSelectOthers(datum.childIds);
      } else if (datum.fullNode) {
        onSelect(datum.fullNode, { lendingPosition: datum.lendingPosition });
      }
    },
    [onSelect, onSelectOthers],
  );

  if (width <= 0 || height <= 0) return null;

  return (
    <div style={{ position: "relative", width, height }}>
      <Stage
        width={width}
        height={height}
        pixelRatio={dpr}
        style={{ backgroundColor: "black" }}
      >
        <Layer>
          <Rect width={width} height={height} fill="black" />
          {tiles}
        </Layer>
      </Stage>
      <div style={SR_ONLY_STYLE}>
        {root.children?.map((node, index) => {
          const datum = node.data;
          return (
            <button
              key={datum.nodeId || index}
              type="button"
              onClick={() => handleTileAction(datum)}
            >
              {getTileLabel(datum)}
            </button>
          );
        })}
      </div>
    </div>
  );
}
