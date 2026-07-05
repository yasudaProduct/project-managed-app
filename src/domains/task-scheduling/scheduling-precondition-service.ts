import type { SchedulingTask } from "./scheduling-task";
import type { TaskDependency } from "@/domains/task-dependency/task-dependency";
import { TaskDependencyValidator } from "@/domains/task-dependency/task-dependency-validator";
import { isSteadyTask } from "./steady-task-classifier";

export type PreconditionWarningKind =
  | "NO_ASSIGNEE"
  | "NO_YOTEI_KOSU"
  | "CYCLIC_DEPENDENCY"
  | "STEADY_NO_PERIOD";

export interface PreconditionWarning {
  kind: PreconditionWarningKind;
  taskId?: number;
  taskNo?: string;
  taskName?: string;
  detail?: string;
  /** CYCLIC_DEPENDENCY のとき、循環を構成するタスクNo */
  cycleTaskNos?: string[];
}

/**
 * スケジュール計算の前提条件をチェックする。
 * 警告があっても計算自体は続行可能（対象外タスクは skip / 循環は除外される）。
 */
export class SchedulingPreconditionService {
  static check(
    tasks: SchedulingTask[],
    dependencies: TaskDependency[],
    steadyTaskKeywords: string[]
  ): PreconditionWarning[] {
    const warnings: PreconditionWarning[] = [];

    for (const t of tasks) {
      const steady = isSteadyTask(t.taskName, steadyTaskKeywords);

      if (t.assigneeId == null) {
        warnings.push({
          kind: "NO_ASSIGNEE",
          taskId: t.taskId,
          taskNo: t.taskNo,
          taskName: t.taskName,
          detail: "担当者が設定されていません",
        });
      }

      if (!steady && (t.yoteiKosu == null || t.yoteiKosu <= 0)) {
        warnings.push({
          kind: "NO_YOTEI_KOSU",
          taskId: t.taskId,
          taskNo: t.taskNo,
          taskName: t.taskName,
          detail: "予定工数が設定されていません",
        });
      }

      if (steady && (!t.yoteiStartDate || !t.yoteiEndDate)) {
        warnings.push({
          kind: "STEADY_NO_PERIOD",
          taskId: t.taskId,
          taskNo: t.taskNo,
          taskName: t.taskName,
          detail: "定常タスクに期間(予定開始日・終了日)が設定されていません",
        });
      }
    }

    const taskNoById = new Map<number, string>();
    for (const t of tasks) taskNoById.set(t.taskId, t.taskNo);

    for (const cycle of TaskDependencyValidator.detectCycles(dependencies)) {
      const cycleTaskNos = cycle
        .map((id) => taskNoById.get(id))
        .filter((no): no is string => no != null);
      warnings.push({
        kind: "CYCLIC_DEPENDENCY",
        detail: "タスク依存に循環があります",
        cycleTaskNos,
      });
    }

    return warnings;
  }
}
