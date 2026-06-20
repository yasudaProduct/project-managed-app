/**
 * スケジュール計算に関するプロジェクト単位の設定。
 * project_settings.schedulingSettings (Json列) に保存される。
 */

export type SteadyDailyHoursMode = "PRORATE" | "FIXED";

export interface SchedulingSettings {
  /** 定常タスク判定に使うキーワード（タスク名の部分一致） */
  steadyTaskKeywords: string[];
  /** 定常タスクが担当者の稼働可能時間を消費する（通常タスクの前詰めに影響する）か */
  consumeSteadyTaskCapacity: boolean;
  /** 定常タスクの日次消費量の決定方式 */
  steadyDailyHoursMode: SteadyDailyHoursMode;
  /** FIXEDモード時のキーワード別の日次固定時間（後続実装。未指定はPRORATEにフォールバック） */
  steadyFixedHoursByKeyword?: Record<string, number>;
}

export const DEFAULT_SCHEDULING_SETTINGS: SchedulingSettings = {
  steadyTaskKeywords: [],
  consumeSteadyTaskCapacity: false,
  steadyDailyHoursMode: "PRORATE",
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

  return {
    steadyTaskKeywords,
    consumeSteadyTaskCapacity:
      typeof obj.consumeSteadyTaskCapacity === "boolean"
        ? obj.consumeSteadyTaskCapacity
        : false,
    steadyDailyHoursMode:
      obj.steadyDailyHoursMode === "FIXED" ? "FIXED" : "PRORATE",
    ...(steadyFixedHoursByKeyword ? { steadyFixedHoursByKeyword } : {}),
  };
}
