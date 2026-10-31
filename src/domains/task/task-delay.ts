import type { TaskStatus } from '@/types/wbs';
import { TASK_DELAY_KINDS, type TaskDelayKind } from '@/types/task-delay';

/**
 * タスクの遅れ・期限間近の判定（ドメインサービス）。
 * 画面の遅延タスク一覧と通知の検知で同じ判定を使うため、ここに一本化する。
 * 日付は暦日で比較する（予定日は @db.Date の UTC 深夜0時。today も呼び出し側で暦日に変換して渡す）。
 */

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export type TaskDelayInput = {
  status: TaskStatus;
  plannedStart: Date | null;
  plannedEnd: Date | null;
};

export type TaskDelay = {
  kind: TaskDelayKind;
  /** 遅れは遅延日数、期限間近は予定終了日までの残日数（本日=0） */
  days: number;
};

function utcDayNumber(date: Date): number {
  return Math.floor(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()) / MS_PER_DAY
  );
}

export function detectTaskDelay(
  task: TaskDelayInput,
  today: Date,
  dueSoonDays: number
): TaskDelay | null {
  // 保留は意図的に止めているため遅れとして扱わない（サマリータブの従来の挙動と同じ）
  if (task.status === 'COMPLETED' || task.status === 'ON_HOLD') return null;

  const todayDay = utcDayNumber(today);

  if (task.plannedEnd) {
    const daysPastEnd = todayDay - utcDayNumber(task.plannedEnd);
    if (daysPastEnd > 0) return { kind: 'END_OVERDUE', days: daysPastEnd };
  }

  // 開始予定日の当日はまだ着手できるため、翌日から開始遅れとする
  if (task.status === 'NOT_STARTED' && task.plannedStart) {
    const daysPastStart = todayDay - utcDayNumber(task.plannedStart);
    if (daysPastStart > 0) return { kind: 'START_OVERDUE', days: daysPastStart };
  }

  if (task.plannedEnd) {
    const daysUntilEnd = utcDayNumber(task.plannedEnd) - todayDay;
    if (daysUntilEnd <= dueSoonDays) return { kind: 'DUE_SOON', days: daysUntilEnd };
  }

  return null;
}

/** 重い順（終了遅れ→開始遅れ→期限間近。遅れは日数の多い順、期限間近は残日数の少ない順） */
export function compareTaskDelays(a: TaskDelay, b: TaskDelay): number {
  const kindOrder = TASK_DELAY_KINDS.indexOf(a.kind) - TASK_DELAY_KINDS.indexOf(b.kind);
  if (kindOrder !== 0) return kindOrder;
  return a.kind === 'DUE_SOON' ? a.days - b.days : b.days - a.days;
}

/**
 * 前回の確認（since）以降に遅れ始めたか。
 * 遅延日数が前回からの経過日数以下なら、前回の時点ではまだ遅れていなかったとみなす。
 * 予定日の変更は追わず、現在の予定日で判定する。
 */
export function isNewlyDelayedSince(delay: TaskDelay, today: Date, since: Date): boolean {
  if (delay.kind === 'DUE_SOON') return false;
  return delay.days <= utcDayNumber(today) - utcDayNumber(since);
}
