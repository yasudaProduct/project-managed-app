import { useState } from "react";
import { Task, GanttStyle } from "./gantt";

interface TaskBarProps {
  task: Task;
  x: number;
  y: number;
  width: number;
  height: number;
  style: GanttStyle;
  onDragStart: (
    taskId: string,
    e: React.MouseEvent,
    mode: "move" | "resize-start" | "resize-end"
  ) => void;
  isDragging: boolean;
}

export const TaskBar = ({
  task,
  x,
  y,
  width,
  height,
  style,
  onDragStart,
  isDragging,
}: TaskBarProps) => {
  const [isHovered, setIsHovered] = useState(false);

  const isOnCriticalPath = task.isOnCriticalPath && style.showCriticalPath;
  const taskColor = isOnCriticalPath ? style.colors.criticalPath : task.color;

  if (task.isMilestone) {
    // Render milestone as diamond
    const size = height * 0.9;
    const centerX = x;
    const centerY = y + height / 2;

    return (
      <g
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Diamond shape */}
        <polygon
          points={`${centerX},${centerY - size / 2} ${
            centerX + size / 2
          },${centerY} ${centerX},${centerY + size / 2} ${
            centerX - size / 2
          },${centerY}`}
          fill={taskColor}
          stroke={isDragging || isHovered ? "#000" : taskColor}
          strokeWidth={isDragging || isHovered ? 2 : 1}
          className="cursor-move"
          onMouseDown={(e) => onDragStart(task.id, e, "move")}
          opacity={isDragging ? 0.7 : 1}
        />

        {/* Milestone label */}
        {style.labelPosition === "inside" && (
          <text
            x={
              style.labelPosition === "inside"
                ? centerX
                : centerX + size / 2 + 8
            }
            y={centerY + 4}
            className="text-xs fill-current text-foreground font-medium"
            textAnchor="start"
            style={{ pointerEvents: "none" }}
          >
            {task.name}
          </text>
        )}

        {/* Critical path indicator */}
        {isOnCriticalPath && (
          <polygon
            points={`${centerX},${centerY - size / 2 - 3} ${centerX + 3},${
              centerY - size / 2
            } ${centerX},${centerY - size / 2 + 3} ${centerX - 3},${
              centerY - size / 2
            }`}
            fill={style.colors.criticalPath}
            className="animate-pulse"
          />
        )}
      </g>
    );
  }

  // Render regular task bar
  const radius = 4;
  const progressWidth = style.showProgress
    ? (width * task.progress) / 100
    : width;
  const minWidth = 20;
  const actualWidth = Math.max(width, minWidth);

  return (
    <g
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Background bar */}
      <rect
        x={x}
        y={y}
        width={actualWidth}
        height={height}
        rx={radius}
        fill={`${taskColor}20`}
        stroke={isDragging || isHovered ? "#000" : `${taskColor}60`}
        strokeWidth={isDragging || isHovered ? 2 : 1}
        className="cursor-move"
        onMouseDown={(e) => onDragStart(task.id, e, "move")}
        opacity={isDragging ? 0.7 : 1}
      />

      {/* Progress bar */}
      {style.showProgress && task.progress > 0 && (
        <rect
          x={x}
          y={y}
          width={Math.min(progressWidth, actualWidth)}
          height={height}
          rx={radius}
          fill={taskColor}
          style={{ pointerEvents: "none" }}
        />
      )}

      {/* Critical path border */}
      {isOnCriticalPath && (
        <rect
          x={x - 1}
          y={y - 1}
          width={actualWidth + 2}
          height={height + 2}
          rx={radius + 1}
          fill="none"
          stroke={style.colors.criticalPath}
          strokeWidth={2}
          strokeDasharray="4,2"
          className="animate-pulse"
          style={{ pointerEvents: "none" }}
        />
      )}

      {/* Resize handles (show on hover) */}
      {(isHovered || isDragging) && !task.isMilestone && actualWidth > 30 && (
        <>
          {/* Left resize handle */}
          <rect
            x={x - 3}
            y={y}
            width={6}
            height={height}
            fill={taskColor}
            className="cursor-ew-resize opacity-60 hover:opacity-100"
            onMouseDown={(e) => {
              e.stopPropagation();
              onDragStart(task.id, e, "resize-start");
            }}
          />

          {/* Right resize handle */}
          <rect
            x={x + actualWidth - 3}
            y={y}
            width={6}
            height={height}
            fill={taskColor}
            className="cursor-ew-resize opacity-60 hover:opacity-100"
            onMouseDown={(e) => {
              e.stopPropagation();
              onDragStart(task.id, e, "resize-end");
            }}
          />
        </>
      )}

      {/* Task label */}
      {style.labelPosition === "outside" && (
        <text
          x={x + actualWidth + 8}
          y={y + height / 2 + 4}
          className="text-xs fill-current text-foreground font-medium"
          textAnchor="start"
          style={{ pointerEvents: "none" }}
        >
          {task.name}
        </text>
      )}

      {/* Progress percentage (inside bar) */}
      {style.showProgress &&
        style.labelPosition === "inside" &&
        actualWidth > 60 && (
          <text
            x={x + actualWidth - 8}
            y={y + height / 2 + 4}
            className="text-xs fill-current text-foreground"
            textAnchor="end"
            style={{ pointerEvents: "none" }}
          >
            {task.progress}%
          </text>
        )}

      {/* Duration indicator for very small bars */}
      {actualWidth < 30 && style.labelPosition === "outside" && (
        <text
          x={x + actualWidth + 8}
          y={y + height + 12}
          className="text-xs fill-current text-muted-foreground"
          style={{ pointerEvents: "none" }}
        >
          {task.duration}d
        </text>
      )}
    </g>
  );
};
