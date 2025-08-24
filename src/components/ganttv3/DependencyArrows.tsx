import React from "react";
import { Task, GanttStyle } from "./gantt";

interface DependencyArrowsProps {
  tasks: Task[];
  dateToX: (date: Date) => number;
  rowHeight: number;
  taskHeight: number;
  style: GanttStyle;
  taskPositions?: Map<string, number>;
}

export const DependencyArrows = ({
  tasks,
  dateToX,
  rowHeight,
  taskHeight,
  style,
  taskPositions: customTaskPositions,
}: DependencyArrowsProps) => {
  const taskPositions = customTaskPositions
    ? new Map(
        tasks.map((task) => [
          task.id,
          {
            x: dateToX(task.startDate),
            y: customTaskPositions.get(task.id) || 0,
            endX: dateToX(task.endDate),
            width: Math.max(
              dateToX(task.endDate) - dateToX(task.startDate),
              20
            ),
          },
        ])
      )
    : new Map(
        tasks.map((task, index) => [
          task.id,
          {
            x: dateToX(task.startDate),
            y: index * rowHeight + taskHeight / 2,
            endX: dateToX(task.endDate),
            width: Math.max(
              dateToX(task.endDate) - dateToX(task.startDate),
              20
            ),
          },
        ])
      );

  const arrows: React.ReactElement[] = [];

  tasks.forEach((task) => {
    const taskPos = taskPositions.get(task.id);
    if (!taskPos) return;

    task.predecessors.forEach((pred, predIndex) => {
      const predPos = taskPositions.get(pred.taskId);
      if (!predPos) return;

      const isOnCriticalPath =
        style.showCriticalPath &&
        task.isOnCriticalPath &&
        tasks.find((t) => t.id === pred.taskId)?.isOnCriticalPath;

      const color = isOnCriticalPath ? style.colors.criticalPath : "#6B7280";
      const strokeWidth = isOnCriticalPath ? 2 : 1;

      let startX: number, startY: number, endX: number, endY: number;

      switch (pred.type) {
        case "FS": // Finish-to-Start
          startX = predPos.endX;
          startY = predPos.y;
          endX = taskPos.x;
          endY = taskPos.y;
          break;
        case "SS": // Start-to-Start
          startX = predPos.x;
          startY = predPos.y;
          endX = taskPos.x;
          endY = taskPos.y;
          break;
        case "FF": // Finish-to-Finish
          startX = predPos.endX;
          startY = predPos.y;
          endX = taskPos.endX;
          endY = taskPos.y;
          break;
        case "SF": // Start-to-Finish
          startX = predPos.x;
          startY = predPos.y;
          endX = taskPos.endX;
          endY = taskPos.y;
          break;
        default:
          return;
      }

      const uniqueKey = `${pred.taskId}-${task.id}-${predIndex}`;

      // Calculate control points for smooth curves
      const midX = (startX + endX) / 2;
      const horizontalSpacing = 20;
      const verticalOffset = 15;

      if (Math.abs(endY - startY) < 5) {
        // Same row - simple horizontal line
        arrows.push(
          <g key={uniqueKey}>
            <line
              x1={startX}
              y1={startY}
              x2={endX - 8}
              y2={endY}
              stroke={color}
              strokeWidth={strokeWidth}
              markerEnd="url(#arrowhead)"
              fill="none"
            />
          </g>
        );
      } else {
        // Different rows - use path with curves
        const pathData =
          endY > startY
            ? `M ${startX} ${startY} 
             Q ${startX + horizontalSpacing} ${startY} ${
                startX + horizontalSpacing
              } ${startY + verticalOffset}
             L ${startX + horizontalSpacing} ${endY - verticalOffset}
             Q ${startX + horizontalSpacing} ${endY} ${
                startX + horizontalSpacing + 10
              } ${endY}
             L ${endX - 8} ${endY}`
            : `M ${startX} ${startY} 
             Q ${startX + horizontalSpacing} ${startY} ${
                startX + horizontalSpacing
              } ${startY - verticalOffset}
             L ${startX + horizontalSpacing} ${endY + verticalOffset}
             Q ${startX + horizontalSpacing} ${endY} ${
                startX + horizontalSpacing + 10
              } ${endY}
             L ${endX - 8} ${endY}`;

        arrows.push(
          <g key={uniqueKey}>
            <path
              d={pathData}
              stroke={color}
              strokeWidth={strokeWidth}
              fill="none"
              markerEnd="url(#arrowhead)"
            />
          </g>
        );
      }

      // Add dependency type label for close inspection
      if (Math.abs(endX - startX) > 50) {
        const labelX = (startX + endX) / 2;
        const labelY = Math.min(startY, endY) - 8;

        arrows.push(
          <text
            key={`${uniqueKey}-label`}
            x={labelX}
            y={labelY}
            className="text-xs fill-current text-muted-foreground"
            textAnchor="middle"
            style={{ pointerEvents: "none", fontSize: "10px" }}
          >
            {pred.type}
            {pred.lag !== 0 && ` ${pred.lag > 0 ? "+" : ""}${pred.lag}d`}
          </text>
        );
      }
    });
  });

  return (
    <g>
      {/* Define arrowhead marker */}
      <defs>
        <marker
          id="arrowhead"
          markerWidth="10"
          markerHeight="7"
          refX="9"
          refY="3.5"
          orient="auto"
          markerUnits="strokeWidth"
        >
          <polygon
            points="0 0, 10 3.5, 0 7"
            fill="currentColor"
            className="text-muted-foreground"
          />
        </marker>
      </defs>
      {arrows}
    </g>
  );
};
