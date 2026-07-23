import { memo } from "react";
import { formatHours } from "./utils/taskFormat";

interface BarLabelProps {
  x: number;
  y: number;
  width: number;
  height: number;
  /** 主ラベル（タスク名） */
  name: string;
  /** 併記する工数(h)。未指定なら非表示 */
  hours?: number;
  /** 右詰めで併記する進捗率(%)。未指定なら非表示 */
  progress?: number;
}

// このpx未満のバーにはラベルを描画しない（潰れて読めないため）
const MIN_LABEL_WIDTH = 28;
// 進捗率まで併記する最小幅（狭いバーでは名前を優先し進捗は省く）
const MIN_PROGRESS_WIDTH = 56;

/**
 * タスクバー内に表示するラベル。
 *
 * `foreignObject` + CSS の `text-overflow: ellipsis` で、
 * バー幅からはみ出す場合に終端を「…」で省略する（SVG text では省略できないため）。
 * `pointerEvents: none` によりバーのドラッグ/クリック操作は阻害しない。
 */
export const BarLabel = memo(function BarLabel({
  x,
  y,
  width,
  height,
  name,
  hours,
  progress,
}: BarLabelProps) {
  if (width < MIN_LABEL_WIDTH) return null;

  const showProgress = progress != null && width >= MIN_PROGRESS_WIDTH;
  const hoursLabel = formatHours(hours);
  const left = hoursLabel ? `${name} (${hoursLabel})` : name;
  // 行高に合わせて 9〜11px でフォントサイズを決める
  const fontSize = Math.min(11, Math.max(9, height - 5));

  return (
    <foreignObject
      x={x}
      y={y}
      width={width}
      height={height}
      style={{ pointerEvents: "none" }}
    >
      <div
        className="flex h-full w-full items-center justify-between gap-1 overflow-hidden px-1 leading-none text-foreground"
        style={{ fontSize }}
      >
        <span className="min-w-0 flex-1 truncate">{left}</span>
        {showProgress && (
          <span className="flex-shrink-0 tabular-nums">{progress}%</span>
        )}
      </div>
    </foreignObject>
  );
});
