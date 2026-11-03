import type { TaskStatus } from '@/types/wbs';

/**
 * タスクの工数超過の判定（ドメインサービス）。
 * しきい値はプロジェクト設定 costOverrunThresholdPct（予定工数に対する実績工数の%）で、
 * サマリータブの「工数超過タスク」と同じ基準（未完了・実績/予定 ≧ しきい値）を超過とする。
 * 超過の手前で気づけるよう、しきい値の8割に達した時点を警告とする。
 */

export const MANHOUR_WARNING_RATIO = 0.8;

export type ManhourOverrunLevel = 'EXCEEDED' | 'WARNING';

export type ManhourOverrunInput = {
  status: TaskStatus;
  plannedHours: number;
  actualHours: number;
};

export type ManhourOverrun = {
  level: ManhourOverrunLevel;
  /** 予定工数に対する実績工数の割合（%、整数に丸め） */
  percentage: number;
};

export function detectManhourOverrun(
  task: ManhourOverrunInput,
  thresholdPct: number
): ManhourOverrun | null {
  if (task.status === 'COMPLETED') return null;
  if (task.plannedHours <= 0 || thresholdPct <= 0) return null;

  const ratioPct = (task.actualHours / task.plannedHours) * 100;
  const percentage = Math.round(ratioPct);
  if (ratioPct >= thresholdPct) return { level: 'EXCEEDED', percentage };
  if (ratioPct >= thresholdPct * MANHOUR_WARNING_RATIO) return { level: 'WARNING', percentage };
  return null;
}
