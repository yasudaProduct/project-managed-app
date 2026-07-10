import React from "react";
import { TimelineScale } from "./gantt";

interface GridLinesProps {
  width: number;
  height: number;
  columnWidth: number;
  rowHeight: number;
  scale: TimelineScale;
  startDate: Date;
  showWeekends: boolean;
  weekendColor: string;
  /**
   * 水平線を引くY座標（行境界）。カテゴリ行とタスク行で高さが異なるため、
   * 実際の行境界を渡してタスクリスト側と一致させる。未指定時は rowHeight 等間隔。
   */
  rowBoundaries?: number[];
}

export const GridLines = ({
  width,
  height,
  columnWidth,
  rowHeight,
  scale,
  startDate,
  showWeekends,
  weekendColor,
  rowBoundaries,
}: GridLinesProps) => {
  const columns = Math.ceil(width / columnWidth);
  const rows = Math.ceil(height / rowHeight);
  // 行境界が渡された場合はそれを使い、無ければ rowHeight 等間隔でフォールバック
  const horizontalYs =
    rowBoundaries ??
    Array.from({ length: rows + 1 }, (_, i) => i * rowHeight);

  // Generate weekend backgrounds
  const weekendRects = [];
  if (showWeekends && scale === "day") {
    for (let i = 0; i < columns; i++) {
      const currentDate = new Date(startDate);
      currentDate.setDate(currentDate.getDate() + i);
      const isWeekend =
        currentDate.getDay() === 0 || currentDate.getDay() === 6;

      if (isWeekend) {
        weekendRects.push(
          <rect
            key={`weekend-${i}`}
            x={i * columnWidth}
            y={0}
            width={columnWidth}
            height={height}
            fill={weekendColor}
            opacity={0.3}
          />
        );
      }
    }
  }

  return (
    <g>
      {/* Weekend backgrounds */}
      {weekendRects}

      {/* Vertical grid lines */}
      {Array.from({ length: columns + 1 }, (_, i) => (
        <line
          key={`v-${i}`}
          x1={i * columnWidth}
          y1={0}
          x2={i * columnWidth}
          y2={height}
          stroke="#e5e7eb"
          strokeWidth={0.5}
        />
      ))}

      {/* Horizontal grid lines（実際の行境界に合わせる） */}
      {horizontalYs.map((y, i) => (
        <line
          key={`h-${i}`}
          x1={0}
          y1={y}
          x2={width}
          y2={y}
          stroke="#e5e7eb"
          strokeWidth={0.5}
        />
      ))}
    </g>
  );
};
