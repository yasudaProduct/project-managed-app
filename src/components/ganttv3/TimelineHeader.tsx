import { useMemo } from "react";
import { TimelineScale } from "./gantt";
import {
  getParentScale,
  buildChildHeaders,
  buildParentHeaders,
} from "./utils/timelineHeaders";

interface TimelineHeaderProps {
  start: Date;
  end: Date;
  scale: TimelineScale;
  columnWidth: number;
  height: number;
  showWeekends: boolean;
  scrollLeft?: number;
}

export const TimelineHeader = ({
  start,
  end,
  scale,
  columnWidth,
  height,
  showWeekends,
  scrollLeft = 0,
}: TimelineHeaderProps) => {
  const parentScale = getParentScale(scale);
  // ヘッダ配列は start/end/scale のみに依存（scrollLeft では再計算しない）
  const childHeaders = useMemo(
    () => buildChildHeaders(start, end, scale),
    [start, end, scale],
  );
  const parentHeaders = useMemo(
    () => (parentScale ? buildParentHeaders(childHeaders, parentScale) : []),
    [childHeaders, parentScale],
  );

  return (
    <div
      className="border-b-2 border-border bg-card shadow-sm flex flex-col"
      style={{ height }}
    >
      {/* Main Header Row - Parent Scale */}
      {parentHeaders.length > 0 ? (
        <div className="border-b border-border bg-muted/50 flex relative flex-1 overflow-hidden h-6">
          <div
            className="flex"
            style={{
              transform: `translateX(-${scrollLeft}px)`,
              minWidth: "max-content",
            }}
          >
            {parentHeaders.map((parentHeader, index) => (
              <div
                key={index}
                className="border-r border-border/40 flex items-center justify-center text-sm font-semibold text-foreground bg-muted/30"
                style={{
                  width: parentHeader.span * columnWidth,
                  minWidth: parentHeader.span * columnWidth,
                }}
              >
                {parentHeader.label}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="border-b border-border bg-muted/50 flex items-center justify-between px-4 h-6">
          <span className="font-semibold text-sm text-foreground">
            {scale.charAt(0).toUpperCase() + scale.slice(1)}
          </span>
          <span className="text-xs text-muted-foreground">
            {start.toLocaleDateString("ja-JP", {
              month: "numeric",
              day: "numeric",
            })}{" "}
            -{" "}
            {end.toLocaleDateString("ja-JP", {
              month: "numeric",
              day: "numeric",
            })}
          </span>
        </div>
      )}

      {/* Column Headers */}
      <div className="flex relative flex-1 overflow-hidden">
        <div
          className="flex"
          style={{
            transform: `translateX(-${scrollLeft}px)`,
            minWidth: "max-content",
          }}
        >
          {childHeaders.map((header, index) => (
            <div
              key={index}
              className={`border-r-2 border-border/60 flex items-center justify-center text-xs font-medium relative h-full
              ${
                header.isWeekend && showWeekends
                  ? "bg-red-50/50 text-red-600"
                  : "bg-background"
              }
              ${
                header.isMainHeader
                  ? "font-bold bg-primary/10 text-primary border-r-primary/30"
                  : ""
              }
            `}
              style={{
                width: columnWidth,
                minWidth: columnWidth,
                maxWidth: columnWidth,
                borderRightWidth: header.isMainHeader ? "2px" : "1px",
                borderRightColor: header.isMainHeader
                  ? "rgb(59 130 246 / 0.5)"
                  : undefined,
              }}
            >
              <span
                className={
                  header.isMainHeader
                    ? "text-primary font-bold"
                    : "text-muted-foreground"
                }
              >
                {header.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
