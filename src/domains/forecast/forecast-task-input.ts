import type { TaskStatus } from "@/types/wbs";

/**
 * 見通し工数計算の入力データ（Domain 層で完結する最小構造）
 * Application 層の WbsTaskData から変換して渡す。
 */
export interface ForecastTaskInput {
  id: string;
  name: string;
  status: TaskStatus;
  progressRate: number | null;
  yoteiKosu: number | null;
  jissekiKosu: number | null;
  /**
   * 定常タスク（プロジェクト管理など期間中一定工数を消費するタスク）か。
   * true の場合、進捗率ベースの通常見通しではなく定常タスク専用方式で算出する。
   */
  isSteady?: boolean;
  /**
   * 定常タスクの稼働日数（isSteady=true かつ ACTUAL_PACE / PLANNED_PACE で使用）。
   * 欠落時は PLANNED 相当にフォールバックする。
   */
  steadyWorkingDays?: {
    /** 予定期間全体の稼働日数 */
    total: number;
    /** 予定開始日〜基準日（今日、予定終了日でクランプ）の稼働日数 */
    elapsed: number;
  };
}
