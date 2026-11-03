import type { TaskStatus } from '@/types/wbs';
import type { MilestoneTargetType, MilestoneForecastStatus } from '@/types/milestone';

/**
 * マイルストーンの達成見込み（ドメインサービス）。
 * - 達成日を記録していれば達成
 * - フェーズ完了型・タスク指定型は、対象タスクがすべて完了なら達成
 * - 見込み日: フェーズ完了型はフェーズの予測完了日（Earned Schedule）を優先し、なければ予定ベース。
 *   タスク指定型は予定ベース（未完了タスクの予定終了日の最大値。予定終了日を過ぎた未完了タスクがあれば今日）
 * - 予定日を過ぎて未達成なら期限超過、見込み日が予定日より後なら遅延見込み
 * 日付は暦日（UTC深夜0時）で比較する。
 */

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export type MilestoneTargetTask = {
  status: TaskStatus;
  plannedEnd: Date | null;
};

export type MilestoneForecastInput = {
  targetType: MilestoneTargetType;
  dueDate: Date;
  achievedAt: Date | null;
  /** 対象タスク（フェーズのタスク、または指定タスクのうち現存するもの） */
  targetTasks: ReadonlyArray<MilestoneTargetTask>;
  /** 指定タスクのうち、削除・振り直しで見つからなくなったものの件数 */
  brokenLinkCount: number;
  /** フェーズ完了型のみ：フェーズの予測完了日 */
  phaseForecastDate: Date | null;
};

export type MilestoneForecast = {
  status: MilestoneForecastStatus;
  forecastDate: Date | null;
  /** 予定日に対する遅れ（日。負値は前倒し）。達成済みは達成日、未達成は見込み日（期限超過は今日）で求める */
  delayDays: number | null;
  completedCount: number;
  totalCount: number;
  brokenLinkCount: number;
};

function dayNumber(date: Date): number {
  return Math.floor(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()) / MS_PER_DAY
  );
}

function planBasedForecast(tasks: ReadonlyArray<MilestoneTargetTask>, today: Date): Date | null {
  let latest: number | null = null;
  for (const task of tasks) {
    if (task.status === 'COMPLETED' || !task.plannedEnd) continue;
    const end = Math.max(dayNumber(task.plannedEnd), dayNumber(today));
    latest = latest === null ? end : Math.max(latest, end);
  }
  return latest === null ? null : new Date(latest * MS_PER_DAY);
}

export function evaluateMilestone(
  input: MilestoneForecastInput,
  today: Date
): MilestoneForecast {
  const completedCount = input.targetTasks.filter((task) => task.status === 'COMPLETED').length;
  const counts = {
    completedCount,
    totalCount: input.targetTasks.length,
    brokenLinkCount: input.brokenLinkCount,
  };
  const due = dayNumber(input.dueDate);

  if (input.achievedAt) {
    return {
      status: 'ACHIEVED',
      forecastDate: null,
      delayDays: dayNumber(input.achievedAt) - due,
      ...counts,
    };
  }

  const isOverdue = dayNumber(today) > due;
  if (input.targetType === 'EVENT') {
    return {
      status: isOverdue ? 'OVERDUE' : 'NO_FORECAST',
      forecastDate: null,
      delayDays: isOverdue ? dayNumber(today) - due : null,
      ...counts,
    };
  }

  if (input.targetTasks.length === 0) {
    return { status: 'NO_TARGET', forecastDate: null, delayDays: null, ...counts };
  }
  if (completedCount === input.targetTasks.length) {
    return { status: 'ACHIEVED', forecastDate: null, delayDays: null, ...counts };
  }

  const forecastDate =
    (input.targetType === 'PHASE' ? input.phaseForecastDate : null) ??
    planBasedForecast(input.targetTasks, today);
  if (isOverdue) {
    return {
      status: 'OVERDUE',
      forecastDate,
      delayDays: forecastDate ? dayNumber(forecastDate) - due : dayNumber(today) - due,
      ...counts,
    };
  }
  if (!forecastDate) {
    return { status: 'NO_FORECAST', forecastDate: null, delayDays: null, ...counts };
  }
  const delayDays = dayNumber(forecastDate) - due;
  return {
    status: delayDays > 0 ? 'AT_RISK' : 'ON_TRACK',
    forecastDate,
    delayDays,
    ...counts,
  };
}
