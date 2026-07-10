import type { WbsTaskData } from "@/applications/wbs/query/iwbs-query-repository";
import type { ForecastTaskInput } from "@/domains/forecast/forecast-task-input";
import { isSteadyTask } from "@/domains/task-scheduling/steady-task-classifier";
import type { CompanyCalendar } from "@/domains/calendar/company-calendar";
import type { TaskStatus } from "@/types/wbs";

/**
 * 定常タスクとして見通しを算出するための付加情報。
 * 呼び出し側（Application 層）で定常判定・稼働日数の算出を行い渡す。
 */
export interface SteadyForecastContext {
  isSteady: boolean;
  workingDays?: { total: number; elapsed: number };
}

/**
 * WbsTaskData（Application層のクエリ結果）から
 * ForecastCalculationService（Domain層）が要求する最小入力型へ変換する
 */
export function toForecastTaskInput(
  task: WbsTaskData,
  steady?: SteadyForecastContext
): ForecastTaskInput {
  return {
    id: task.id,
    name: task.name,
    status: task.status as TaskStatus,
    progressRate: task.progressRate,
    yoteiKosu: task.yoteiKosu,
    jissekiKosu: task.jissekiKosu,
    ...(steady?.isSteady
      ? { isSteady: true, steadyWorkingDays: steady.workingDays }
      : {}),
  };
}

/**
 * 定常タスクの見通し算出コンテキストを構築する。
 * 定常タスクでなければ undefined。定常タスクなら予定期間の稼働日数（総／経過）を会社カレンダーから算出する。
 * 予定期間が無い場合は稼働日数を出せないため PLANNED 相当（workingDays なし）にフォールバックする。
 *
 * @param now 経過稼働日数の基準日（既定は現在時刻）
 */
export function buildSteadyForecastContext(
  task: WbsTaskData,
  steadyTaskKeywords: string[],
  companyCalendar: CompanyCalendar,
  now: Date = new Date()
): SteadyForecastContext | undefined {
  if (!isSteadyTask(task.name, steadyTaskKeywords)) {
    return undefined;
  }
  if (!task.yoteiStart) {
    return { isSteady: true };
  }

  const start = new Date(task.yoteiStart);
  const end = task.yoteiEnd ? new Date(task.yoteiEnd) : start;
  const total = companyCalendar.countWorkingDays(start, end);

  // 経過稼働日数: 予定開始 〜 min(今日, 予定終了)
  let elapsed = 0;
  if (now.getTime() >= start.getTime()) {
    const elapsedEnd = now.getTime() < end.getTime() ? now : end;
    elapsed = companyCalendar.countWorkingDays(start, elapsedEnd);
  }

  return { isSteady: true, workingDays: { total, elapsed } };
}
