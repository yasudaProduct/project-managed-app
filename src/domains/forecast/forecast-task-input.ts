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
}
