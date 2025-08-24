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
}: GridLinesProps) => {
  const columns = Math.ceil(width / columnWidth);
  const rows = Math.ceil(height / rowHeight);

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

      {/* Horizontal grid lines */}
      {Array.from({ length: rows + 1 }, (_, i) => (
        <line
          key={`h-${i}`}
          x1={0}
          y1={i * rowHeight}
          x2={width}
          y2={i * rowHeight}
          stroke="#e5e7eb"
          strokeWidth={0.5}
        />
      ))}
    </g>
  );
};
