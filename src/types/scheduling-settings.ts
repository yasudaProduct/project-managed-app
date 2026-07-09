/**
 * スケジュール計算に関するプロジェクト単位の設定。
 * project_settings.schedulingSettings (Json列) に保存される。
 */

/** 基準日の決定モード */
export type BaselineMode = 'PROJECT_START' | 'TODAY' | 'CUSTOM';

export type SteadyDailyHoursMode = "PRORATE" | "FIXED";

/**
 * 定常タスクの見通し工数算出方式。
 * 定常タスク（プロジェクト管理など期間中一定工数を消費するタスク）は「完了」概念を持たず、
 * 進捗率ベースの通常見通し（ForecastCalculationService）に馴染まないため、専用の方式で算出する。
 *
 * - PLANNED      : 予定ベース。見通し = max(予定, 実績)。進捗率も稼働日数も使わない最小方式。
 * - ACTUAL_PACE  : 実績ペース基準（保守的）。見通し = (実績 ÷ 経過稼働日数) × 期間全体の稼働日数。
 * - PLANNED_PACE : 予定ペース基準（楽観的）。見通し = 実績 + 残り稼働日数 × (予定 ÷ 期間全体の稼働日数)。
 */
export type SteadyTaskForecastMode = "PLANNED" | "ACTUAL_PACE" | "PLANNED_PACE";

export const STEADY_TASK_FORECAST_MODES: SteadyTaskForecastMode[] = [
  "PLANNED",
  "ACTUAL_PACE",
  "PLANNED_PACE",
];

export const STEADY_TASK_FORECAST_MODE_LABELS: Record<
  SteadyTaskForecastMode,
  string
> = {
  PLANNED: "予定ベース",
  ACTUAL_PACE: "実績ペース（保守的）",
  PLANNED_PACE: "予定ペース（楽観的）",
};

export const STEADY_TASK_FORECAST_MODE_DESCRIPTIONS: Record<
  SteadyTaskForecastMode,
  string
> = {
  PLANNED: "見通し = max(予定, 実績)。進捗率を使わず予定工数をそのまま見通しとします。",
  ACTUAL_PACE:
    "見通し = (実績 ÷ 経過稼働日数) × 期間全体の稼働日数。今の消化ペースが期間末まで続くと仮定します。",
  PLANNED_PACE:
    "見通し = 実績 + 残り稼働日数 × (予定 ÷ 期間全体の稼働日数)。残りは予定ペースで消化すると仮定します。",
};

export interface SchedulingSettings {
  /** 定常タスク判定に使うキーワード（タスク名の部分一致） */
  steadyTaskKeywords: string[];
  /** 定常タスクが担当者の稼働可能時間を消費する（通常タスクの前詰めに影響する）か */
  consumeSteadyTaskCapacity: boolean;
  /** 定常タスクの日次消費量の決定方式 */
  steadyDailyHoursMode: SteadyDailyHoursMode;
  /** FIXEDモード時のキーワード別の日次固定時間（後続実装。未指定はPRORATEにフォールバック） */
  steadyFixedHoursByKeyword?: Record<string, number>;
  /** 定常タスクの見通し工数算出方式（月別集計・ガントの見通しで使用） */
  steadyTaskForecastMode: SteadyTaskForecastMode;
}

export const DEFAULT_SCHEDULING_SETTINGS: SchedulingSettings = {
  steadyTaskKeywords: [],
  consumeSteadyTaskCapacity: false,
  steadyDailyHoursMode: "PRORATE",
  steadyTaskForecastMode: "PLANNED",
};

/**
 * 永続化された任意の値（Json）を SchedulingSettings に正規化する。
 * 不正・欠損値はデフォルトで補う。Server Action / リポジトリの双方から利用する。
 */
export function parseSchedulingSettings(raw: unknown): SchedulingSettings {
  if (!raw || typeof raw !== "object") {
    return { ...DEFAULT_SCHEDULING_SETTINGS };
  }
  const obj = raw as Record<string, unknown>;

  const steadyTaskKeywords = Array.isArray(obj.steadyTaskKeywords)
    ? obj.steadyTaskKeywords
        .filter((k): k is string => typeof k === "string")
        .map((k) => k.trim())
        .filter((k) => k.length > 0)
    : [];

  const steadyFixedHoursByKeyword =
    obj.steadyFixedHoursByKeyword &&
    typeof obj.steadyFixedHoursByKeyword === "object"
      ? Object.fromEntries(
          Object.entries(
            obj.steadyFixedHoursByKeyword as Record<string, unknown>
          )
            .filter(([, v]) => typeof v === "number" && Number.isFinite(v))
            .map(([k, v]) => [k, v as number])
        )
      : undefined;

  const steadyTaskForecastMode: SteadyTaskForecastMode =
    obj.steadyTaskForecastMode === "ACTUAL_PACE" ||
    obj.steadyTaskForecastMode === "PLANNED_PACE"
      ? obj.steadyTaskForecastMode
      : "PLANNED";

  return {
    steadyTaskKeywords,
    consumeSteadyTaskCapacity:
      typeof obj.consumeSteadyTaskCapacity === "boolean"
        ? obj.consumeSteadyTaskCapacity
        : false,
    steadyDailyHoursMode:
      obj.steadyDailyHoursMode === "FIXED" ? "FIXED" : "PRORATE",
    steadyTaskForecastMode,
    ...(steadyFixedHoursByKeyword ? { steadyFixedHoursByKeyword } : {}),
  };
}
