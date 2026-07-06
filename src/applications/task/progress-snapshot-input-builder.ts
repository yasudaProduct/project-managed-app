import { Task } from '@/domains/task/task';
import type { TaskProgressSnapshotInput } from './itask-repository';

/** 担当者未設定・単価未登録時に適用するデフォルト単価（円/時） */
export const DEFAULT_COST_PER_HOUR = 5000;

/**
 * Task ドメインから進捗スナップショット入力（時点データ・自己完結）を構築する。
 * WBS同期・手動編集（ガント等）の両方の記録経路で共用する。
 * 実績日は呼び出し元が持つ情報（Excel実績 or 直近スナップショットからの引き継ぎ）を渡す。
 */
export function buildProgressSnapshotInput(args: {
  task: Task;
  costPerHour: number;
  actualStart: Date | null;
  actualEnd: Date | null;
}): TaskProgressSnapshotInput {
  const { task, costPerHour, actualStart, actualEnd } = args;
  const kijun = task.periods?.find((p) => p.type.type === 'KIJUN');
  const yotei = task.periods?.find((p) => p.type.type === 'YOTEI');
  const baseManHours = sumNormalKosu(kijun);
  const plannedManHours = yotei ? sumNormalKosu(yotei) : baseManHours;

  return {
    taskId: task.id ?? null, // 新規はnull（create後にtaskNoで解決）
    taskNo: task.taskNo.getValue(),
    progressRate: task.progressRate ?? null,
    status: task.status.status,
    plannedManHours,
    baseManHours,
    costPerHour,
    plannedStart: yotei?.startDate ?? null,
    plannedEnd: yotei?.endDate ?? null,
    baseStart: kijun?.startDate ?? null,
    baseEnd: kijun?.endDate ?? null,
    actualStart,
    actualEnd,
    isRemoved: false,
  };
}

function sumNormalKosu(period?: {
  manHours: { kosu: number; type: { type: string } }[];
}): number {
  return (period?.manHours ?? [])
    .filter((m) => m.type.type === 'NORMAL')
    .reduce((sum, m) => sum + Number(m.kosu), 0);
}
