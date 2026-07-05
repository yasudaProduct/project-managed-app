import { injectable, inject } from "inversify";
import type { IQueryHandler } from "@/applications/shared/cqrs/base-classes";
import { GetWbsTaskSummaryQuery } from "./get-wbs-task-summary-query";
import type { WbsTaskSummaryResult } from "./wbs-task-summary-result";
import { SYMBOL } from "@/types/symbol";
import type { IWbsQueryRepository, WbsTaskData } from "@/applications/wbs/query/iwbs-query-repository";

@injectable()
export class GetWbsTaskSummaryHandler
  implements IQueryHandler<GetWbsTaskSummaryQuery, WbsTaskSummaryResult> {
  constructor(
    @inject(SYMBOL.IWbsQueryRepository)
    private readonly wbsQueryRepository: IWbsQueryRepository
  ) { }

  async execute(query: GetWbsTaskSummaryQuery): Promise<WbsTaskSummaryResult> {
    const [tasks, unlinkedWorkRecordsCount] = await Promise.all([
      this.wbsQueryRepository.getWbsTasks(query.wbsId),
      this.wbsQueryRepository.getUnlinkedWorkRecordsCount(query.wbsId),
    ]);

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const totalTasks = tasks.length;
    const actualCompleted = tasks.filter((t) => t.status === "COMPLETED").length;
    const actualInProgress = tasks.filter((t) => t.status === "IN_PROGRESS").length;

    let plannedCompleted = 0;
    let plannedInProgress = 0;
    let plannedCompletedKosu = 0;
    for (const task of tasks) {
      if (task.status === "ON_HOLD") continue;
      if (!task.yoteiStart) continue;

      const startDay = toDateOnly(task.yoteiStart);
      const endDay = toDateOnly(task.yoteiEnd ?? task.yoteiStart);

      if (today > endDay) {
        plannedCompleted++;
        plannedCompletedKosu += task.yoteiKosu ?? 0;
      } else if (today >= startDay) {
        plannedInProgress++;
      }
    }

    const actualProgress =
      totalTasks > 0 ? Math.round((actualCompleted / totalTasks) * 100) : 0;
    const tasksWithYotei = tasks.filter(
      (t) => t.yoteiStart !== null && t.status !== "ON_HOLD"
    ).length;
    const plannedProgress =
      tasksWithYotei > 0
        ? Math.round((plannedCompleted / tasksWithYotei) * 100)
        : 0;

    return {
      taskKosu: sumKosu(tasks, "yoteiKosu"),
      taskJisseki: sumKosu(tasks, "jissekiKosu"),
      kijunKosu: sumKosu(tasks, "kijunKosu"),
      unlinkedWorkRecordsCount,
      actualCompleted,
      plannedCompleted,
      actualInProgress,
      plannedInProgress,
      plannedCompletedKosu,
      actualProgress,
      plannedProgress,
    };
  }
}

function toDateOnly(date: Date): Date {
  const d = new Date(date);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function sumKosu(
  tasks: WbsTaskData[],
  key: "kijunKosu" | "yoteiKosu" | "jissekiKosu"
): number {
  return tasks.reduce((acc, task) => acc + (task[key] ?? 0), 0);
}
