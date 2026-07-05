import type { WbsTaskData } from "@/applications/wbs/query/wbs-query-repository";
import type { ForecastTaskInput } from "@/domains/forecast/forecast-task-input";
import type { TaskStatus } from "@/types/wbs";

/**
 * WbsTaskData（Application層のクエリ結果）から
 * ForecastCalculationService（Domain層）が要求する最小入力型へ変換する
 */
export function toForecastTaskInput(task: WbsTaskData): ForecastTaskInput {
  return {
    id: task.id,
    name: task.name,
    status: task.status as TaskStatus,
    progressRate: task.progressRate,
    yoteiKosu: task.yoteiKosu,
    jissekiKosu: task.jissekiKosu,
  };
}
