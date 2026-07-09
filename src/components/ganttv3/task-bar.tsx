import { useState, memo } from "react";
import { Task, GanttStyle } from "./gantt";
import type { ConnectSide } from "./utils/dependencyConnect";
import { BarLabel } from "./bar-label";

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
  /** 編集モード時のみドラッグ用カーソル・リサイズハンドルを表示 */
  editable?: boolean;
  /** 依存関係の接続ドラッグ開始（指定時のみ接続ハンドルを表示） */
  onConnectStart?: (
    taskId: string,
    e: React.MouseEvent,
    side: ConnectSide
  ) => void;
  /** 接続ドラッグの起点タスクか（ドラッグ中はホバーなしでもハンドルを表示し続ける） */
  isConnectSource?: boolean;
  /** バーのクリック（非編集モードの詳細サイドバー表示用） */
  onSelect?: (taskId: string) => void;
  /** バーへのホバー開始（ツールチップ表示用）。mousemove では発火させず再レンダーを抑える */
  onHover?: (task: Task, e: React.MouseEvent) => void;
  /** バーからホバーが外れた */
  onHoverEnd?: () => void;
}

export const TaskBar = memo(function TaskBar({
  task,
  x,
  y,
  width,
  height,
  style,
  onDragStart,
  isDragging,
  editable = false,
  onConnectStart,
  isConnectSource = false,
  onSelect,
  onHover,
  onHoverEnd,
}: TaskBarProps) {
  const [isHovered, setIsHovered] = useState(false);

  // ホバー系ハンドラ（ツールチップ表示）。マイルストーン/通常バー共通で使う。
  // ツールチップ位置は「ホバー開始時のカーソル座標」で固定し、mousemove では
  // 更新しない（チャート全体の連続再レンダーを避けるため）。
  const handleMouseEnter = (e: React.MouseEvent) => {
    setIsHovered(true);
    onHover?.(task, e);
  };
  const handleMouseLeave = () => {
    setIsHovered(false);
    onHoverEnd?.();
  };

  const isOnCriticalPath = task.isOnCriticalPath && style.showCriticalPath;
  // クリティカルパス上でもバー色・枠線はフェーズ色（task.color）に合わせる
  const taskColor = task.color;

  if (task.isMilestone) {
    // Render milestone as diamond
    const size = height * 0.9;
    const centerX = x;
    const centerY = y + height / 2;

    return (
      <g
        data-task-id={task.id}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
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
          className={
            editable
              ? "cursor-move"
              : onSelect
                ? "cursor-pointer"
                : "cursor-default"
          }
          onMouseDown={(e) => onDragStart(task.id, e, "move")}
          onClick={() => onSelect?.(task.id)}
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
            fill={taskColor}
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
      data-task-id={task.id}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
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
        className={
          editable
            ? "cursor-move"
            : onSelect
              ? "cursor-pointer"
              : "cursor-default"
        }
        onMouseDown={(e) => onDragStart(task.id, e, "move")}
        onClick={() => onSelect?.(task.id)}
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
          stroke={taskColor}
          strokeWidth={2}
          strokeDasharray="4,2"
          className="animate-pulse"
          style={{ pointerEvents: "none" }}
        />
      )}

      {/* Resize handles (編集モードでホバー時のみ表示) */}
      {editable &&
        (isHovered || isDragging) &&
        !task.isMilestone &&
        actualWidth > 30 && (
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

      {/* Connect handles (依存関係のドラッグ接続。編集モードでホバー中 or 接続ドラッグの起点) */}
      {editable && onConnectStart && (isHovered || isConnectSource) && (
          <>
            <circle
              data-side="start"
              cx={x}
              cy={y + height / 2}
              r={5}
              fill="#fff"
              stroke="#3B82F6"
              strokeWidth={1.5}
              className="gantt-connect-handle cursor-crosshair"
              onMouseDown={(e) => {
                e.stopPropagation();
                onConnectStart(task.id, e, "start");
              }}
            >
              <title>ドラッグして依存関係を作成</title>
            </circle>
            <circle
              data-side="end"
              cx={x + actualWidth}
              cy={y + height / 2}
              r={5}
              fill="#fff"
              stroke="#3B82F6"
              strokeWidth={1.5}
              className="gantt-connect-handle cursor-crosshair"
              onMouseDown={(e) => {
                e.stopPropagation();
                onConnectStart(task.id, e, "end");
              }}
            >
              <title>ドラッグして依存関係を作成</title>
            </circle>
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

      {/* In-bar label: タスク名 + 工数 +（進捗率）。inside 配置時のみ表示 */}
      {style.labelPosition === "inside" && (
        <BarLabel
          x={x}
          y={y}
          width={actualWidth}
          height={height}
          name={task.name}
          hours={task.duration}
          progress={style.showProgress ? task.progress : undefined}
        />
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
});
