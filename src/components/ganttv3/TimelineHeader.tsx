import { TimelineScale } from "./gantt";

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
  // Get parent scale for hierarchical display
  const getParentScale = (scale: TimelineScale): TimelineScale | null => {
    switch (scale) {
      case "day":
        return "month";
      case "week":
        return "month";
      case "month":
        return "year";
      case "quarter":
        return "year";
      default:
        return null;
    }
  };

  const generateParentHeaders = (parentScale: TimelineScale) => {
    const parentHeaders: {
      date: Date;
      label: string;
      span: number; // How many child columns this parent spans
    }[] = [];

    let currentParentDate: Date | null = null;
    let currentSpan = 0;

    const childHeaders = generateChildHeaders();

    childHeaders.forEach((childHeader, index) => {
      let parentDate: Date;

      switch (parentScale) {
        case "month":
          parentDate = new Date(
            childHeader.date.getFullYear(),
            childHeader.date.getMonth(),
            1
          );
          break;
        case "year":
          parentDate = new Date(childHeader.date.getFullYear(), 0, 1);
          break;
        default:
          return;
      }

      if (
        !currentParentDate ||
        parentDate.getTime() !== currentParentDate.getTime()
      ) {
        if (currentParentDate) {
          parentHeaders.push({
            date: currentParentDate,
            label: getCurrentParentLabel(currentParentDate, parentScale),
            span: currentSpan,
          });
        }
        currentParentDate = parentDate;
        currentSpan = 1;
      } else {
        currentSpan++;
      }

      // Add the last parent header
      if (index === childHeaders.length - 1) {
        parentHeaders.push({
          date: currentParentDate,
          label: getCurrentParentLabel(currentParentDate, parentScale),
          span: currentSpan,
        });
      }
    });

    return parentHeaders;
  };

  const getCurrentParentLabel = (
    date: Date,
    parentScale: TimelineScale
  ): string => {
    switch (parentScale) {
      case "month":
        return date.toLocaleDateString("ja-JP", { month: "short" });
      case "year":
        return date.getFullYear().toString();
      default:
        return "";
    }
  };

  const generateChildHeaders = () => {
    const headers: {
      date: Date;
      label: string;
      isWeekend: boolean;
      isMainHeader: boolean;
    }[] = [];

    // Calculate the total width available and number of columns needed
    const totalDays = Math.ceil(
      (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
    );

    let scaleMultiplier: number;

    switch (scale) {
      case "day":
        scaleMultiplier = 1;
        break;
      case "week":
        scaleMultiplier = 7;
        break;
      case "month":
        scaleMultiplier = 30; // Approximate days per month
        break;
      case "quarter":
        scaleMultiplier = 90; // Approximate days per quarter
        break;
      default:
        scaleMultiplier = 7;
    }

    const totalColumns = Math.ceil(totalDays / scaleMultiplier);
    const current = new Date(start);

    for (let i = 0; i < totalColumns; i++) {
      const isWeekend = current.getDay() === 0 || current.getDay() === 6;

      switch (scale) {
        case "day":
          headers.push({
            date: new Date(current),
            label: current
              .toLocaleDateString("ja-JP", {
                month: "numeric",
                day: "numeric",
              })
              .replace(/\./g, "/"),
            isWeekend,
            isMainHeader: current.getDate() === 1,
          });
          current.setDate(current.getDate() + 1);
          break;

        case "week":
          // Align to Monday
          const dayOfWeek = current.getDay();
          const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
          const weekStart = new Date(current);
          weekStart.setDate(current.getDate() - daysToMonday);

          const weekNumber = getWeekNumber(weekStart);

          headers.push({
            date: new Date(weekStart),
            label: `W${weekNumber}`,
            isWeekend: false,
            isMainHeader: weekStart.getDate() <= 7, // First week of month
          });
          current.setDate(current.getDate() + 7);
          break;

        case "month":
          headers.push({
            date: new Date(current),
            label: current.toLocaleDateString("ja-JP", { month: "short" }),
            isWeekend: false,
            isMainHeader: current.getMonth() % 3 === 0, // Quarterly
          });
          current.setMonth(current.getMonth() + 1);
          current.setDate(1);
          break;

        case "quarter":
          const quarter = Math.floor(current.getMonth() / 3) + 1;
          headers.push({
            date: new Date(current),
            label: `Q${quarter} ${current.getFullYear()}`,
            isWeekend: false,
            isMainHeader: quarter === 1, // Yearly
          });
          current.setMonth(current.getMonth() + 3);
          current.setDate(1);
          break;
      }
    }

    return headers;
  };

  const getWeekNumber = (date: Date): number => {
    const startOfYear = new Date(date.getFullYear(), 0, 1);
    const pastDaysOfYear = (date.getTime() - startOfYear.getTime()) / 86400000;
    return Math.ceil((pastDaysOfYear + startOfYear.getDay() + 1) / 7);
  };

  const parentScale = getParentScale(scale);
  const childHeaders = generateChildHeaders();
  const parentHeaders = parentScale ? generateParentHeaders(parentScale) : [];

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
