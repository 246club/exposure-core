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

const JETBRAINS_MONO = "'JetBrains Mono', monospace";

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
    const x = Math.round(x0) + 1;
    const y = Math.round(y0) + 1;
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

    const othersFill = "#EAE5D9";
    const fill =
      isOthers || isVault || hasAllocations
        ? othersFill
        : isTerminal
          ? "#FFF1F2"
          : "#E6EBF8";
    const stroke = isTerminal ? "rgba(225, 29, 72, 0.5)" : "#000000";
    const textColor = isTerminal ? "#9F1239" : "#000000";

    const headerHeight =
      isOthers || hasAllocations || isVault
        ? Math.min(26, Math.max(16, Math.floor(height * 0.2)))
        : 0;

    const logoPaths = data.fullNode ? getNodeLogos(data.fullNode) : [];
    const showLogos = logoPaths.length > 0 && width > 60 && height > 50;

    const ellipsizeToWidth = (
      value: string,
      maxWidth: number,
      fontSize: number,
    ) => {
      const approxCharWidth = fontSize * 0.6;
      const maxChars = Math.max(3, Math.floor(maxWidth / approxCharWidth));
      if (value.length <= maxChars) return value;
      return value.slice(0, Math.max(0, maxChars - 3)) + "...";
    };

    const label =
      isOthers || hasAllocations || isVault
        ? `${data.name} +${data.childCount || data.allocations?.length || 0} ${currencyFormatter.format(data.originalValue)}`
        : `${data.name} ${currencyFormatter.format(data.originalValue)}`;

    const fontSize = 11;
    const ellipsizedLabel = ellipsizeToWidth(label, width - 16, fontSize);

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
          width={Math.max(0, width - 1)}
          height={Math.max(0, height - 1)}
          fill={fill}
          opacity={isPressed || isSelected ? 0.8 : 1}
        />
        {isSelected && (
          <Rect
            width={Math.max(0, width - 1)}
            height={Math.max(0, height - 1)}
            fill="rgba(0, 0, 0, 0.08)"
            listening={false}
          />
        )}

        {width > 40 && height > 20 && (
          <Group
            clipFunc={(ctx: SceneContext) => {
              ctx.rect(0, 0, width - 1, height - 1);
            }}
          >
            {showLogos &&
              logoPaths
                .slice(0, 3)
                .map((path, idx) => (
                  <AssetLogo
                    key={path}
                    url={path}
                    x={8 + idx * 12}
                    y={(headerHeight || 20) / 2 - 8}
                    size={16}
                  />
                ))}
            <Text
              text={ellipsizedLabel}
              x={showLogos ? 8 + Math.min(logoPaths.length, 3) * 12 + 12 : 8}
              y={(headerHeight || 20) / 2 - fontSize / 2}
              fontSize={fontSize}
              fontFamily={JETBRAINS_MONO}
              fill={textColor}
              fontStyle="bold"
              listening={false}
            />
          </Group>
        )}

        {(hasAllocations || isVault) && width > 80 && height > 80 && (
          <Group x={6} y={headerHeight + 6}>
            {/* Sharp 1px black border using the gutter technique */}
            <Rect
              width={Math.max(0, width - 12)}
              height={Math.max(0, height - headerHeight - 12)}
              fill="#000000"
              listening={false}
            />
            <Rect
              x={1}
              y={1}
              width={Math.max(0, width - 12 - 2)}
              height={Math.max(0, height - headerHeight - 12 - 2)}
              fill="#E6EBF8"
              listening={false}
            />
            {data.allocations && data.allocations.length > 0 && (
              <Text
                text={ellipsizeToWidth(
                  `+${data.allocations.length} OTHERS`,
                  width - 24,
                  fontSize,
                )}
                x={6}
                y={16 - fontSize / 2}
                fontSize={fontSize}
                fontFamily={JETBRAINS_MONO}
                fill="rgba(0,0,0,0.6)"
                fontStyle="bold"
                listening={false}
              />
            )}
          </Group>
        )}

        {isTerminal && (
          <Rect
            width={Math.max(0, width - 1)}
            height={Math.max(0, height - 1)}
            stroke={stroke}
            strokeWidth={1}
            dash={[4, 3]}
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

  if (width <= 0 || height <= 0) return null;

  return (
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
  );
}
