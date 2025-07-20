"use client";

import React from "react";
import { ViewMode } from "./gantt-controls";

interface TimeInterval {
  date: Date;
  position: number;
  width: number;
}

interface GanttTimeAxisProps {
  timeAxis: TimeInterval[];
  chartWidth: number;
  viewMode: ViewMode;
  headerScrollRef: React.RefObject<HTMLDivElement | null>;
  onScroll: () => void;
}

export default function GanttTimeAxis({
  timeAxis,
  chartWidth,
  viewMode,
  headerScrollRef,
  onScroll,
}: GanttTimeAxisProps) {
  return (
    <div
      ref={headerScrollRef}
      className="h-12 border-b border-gray-200 bg-gray-100 overflow-x-auto overflow-y-hidden [&::-webkit-scrollbar]:hidden"
      onScroll={onScroll}
      style={{
        scrollbarWidth: "none",
        msOverflowStyle: "none",
      }}
    >
      <div className="relative h-full" style={{ width: `${chartWidth}px` }}>
        {timeAxis.map((interval, index) => (
          <div
            key={index}
            className="absolute top-0 h-full border-r border-gray-300 flex items-center justify-center text-xs font-medium bg-transparent"
            style={{
              left: `${interval.position}px`,
              width: `${interval.width}px`,
            }}
          >
            <span className="px-1 truncate">
              {viewMode === "day" &&
                interval.date.toLocaleDateString("ja-JP", {
                  month: "short",
                  day: "numeric",
                })}
              {viewMode === "week" &&
                interval.date.toLocaleDateString("ja-JP", {
                  month: "short",
                  day: "numeric",
                })}
              {viewMode === "month" &&
                interval.date.toLocaleDateString("ja-JP", {
                  year: "numeric",
                  month: "short",
                })}
              {viewMode === "quarter" &&
                `${interval.date.getFullYear()}Q${Math.ceil(
                  (interval.date.getMonth() + 1) / 3
                )}`}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
