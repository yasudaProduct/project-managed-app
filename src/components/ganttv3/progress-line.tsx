import { memo, useMemo } from "react";
import type { Task } from "./gantt";
import {
  buildProgressLinePoints,
  type ProgressLineRow,
} from "./utils/progressLine";

interface ProgressLineProps {
  /** 可視タスク（上から順） */
  tasks: Task[];
  /** タスクID → 行中心Y座標 */
  centerYById: Map<string, number>;
  /** 日付→X座標の変換（タイムライン基準） */
  dateToX: (date: Date) => number;
  /** タイムラインの表示範囲（基準日が範囲外なら描画しない） */
  timelineStart: Date;
  timelineEnd: Date;
  /** 折れ線の上端・下端Y（基準日ライン上の端点） */
  topY: number;
  bottomY: number;
  /** 線色 */
  color: string;
  /** 基準日（既定は現在時刻）。テスト用に注入可能 */
  today?: Date;
}

/** SVG座標の小数精度を抑える（rendering-svg-precision） */
const round = (n: number): number => Math.round(n * 10) / 10;

/**
 * イナズマ線（進捗線）を描画する表示専用コンポーネント。
 * 基準日の縦線に対し、各タスクの進捗点を上から結んだジグザグ線を描く。
 * props で完結し、頻繁に変わる値には依存しないため memo 化する。
 */
export const ProgressLine = memo(function ProgressLine({
  tasks,
  centerYById,
  dateToX,
  timelineStart,
  timelineEnd,
  topY,
  bottomY,
  color,
  today,
}: ProgressLineProps) {
  const points = useMemo(() => {
    const now = today ?? new Date();
    // 基準日がタイムライン範囲外なら比較基準が画面外のため描画しない
    if (now < timelineStart || now > timelineEnd) return null;

    const todayMs = now.getTime();
    const todayX = dateToX(now);

    const rows: ProgressLineRow[] = [];
    for (const task of tasks) {
      const centerY = centerYById.get(task.id);
      if (centerY === undefined) continue;
      rows.push({ task, centerY });
    }
    return buildProgressLinePoints(
      rows,
      todayMs,
      todayX,
      dateToX,
      topY,
      bottomY,
    );
  }, [today, tasks, centerYById, dateToX, timelineStart, timelineEnd, topY, bottomY]);

  // points が端点のみ（進捗点が1つも無い）の場合は、本日ラインと重複する
  // 意味のない縦線になるため描画しない
  if (!points || points.length <= 2) return null;

  const pointsAttr = points.map((p) => `${round(p.x)},${round(p.y)}`).join(" ");
  // 頂点ドット（先頭・末尾の基準日端点は除く）
  const vertices = points.slice(1, -1);

  return (
    <g data-testid="ganttv3-progress-line" className="pointer-events-none">
      <polyline
        points={pointsAttr}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {vertices.map((p, i) => (
        <circle key={i} cx={round(p.x)} cy={round(p.y)} r={2.5} fill={color} />
      ))}
    </g>
  );
});
