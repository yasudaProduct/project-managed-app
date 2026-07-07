import type { SchedulingTask } from "./scheduling-task";
import type { ScheduledTask } from "./scheduled-result";
import type { TaskDependency } from "@/domains/task-dependency/task-dependency";
import { TaskDependencyValidator } from "@/domains/task-dependency/task-dependency-validator";
import { isSteadyTask } from "./steady-task-classifier";
import { toDateKey } from "./working-calendar-walker";

export type PreconditionWarningKind =
  | "NO_ASSIGNEE"
  | "NO_YOTEI_KOSU"
  | "CYCLIC_DEPENDENCY"
  | "STEADY_NO_PERIOD"
  | "ON_HOLD"
  | "COMPLETED_NO_PERIOD"
  | "EXCEEDS_PROJECT_END";

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

      if (t.status === "ON_HOLD") {
        warnings.push({
          kind: "ON_HOLD",
          taskId: t.taskId,
          taskNo: t.taskNo,
          taskName: t.taskName,
          detail: "保留タスクも計算対象になります（未着手と同様の扱い）",
        });
      }

      if (
        t.status === "COMPLETED" &&
        (!(t.jissekiStartDate ?? t.yoteiStartDate) ||
          !(t.jissekiEndDate ?? t.yoteiEndDate))
      ) {
        warnings.push({
          kind: "COMPLETED_NO_PERIOD",
          taskId: t.taskId,
          taskNo: t.taskNo,
          taskName: t.taskName,
          detail:
            "完了タスクに日程(実績・予定)がなく、後続タスクの依存制約に反映されません",
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

  /**
   * 計算結果がプロジェクト終了日に収まっているかをチェックする（計算後の検証）。
   * 終了日超過はリスケ判断の主要シグナルのため、日付が確定した全タスクを対象にする
   * （完了固定タスクの実績超過も含む）。日付比較は日単位（ローカル日付キー）。
   */
  static checkProjectEnd(
    scheduled: ScheduledTask[],
    projectEndDate: Date
  ): PreconditionWarning[] {
    const warnings: PreconditionWarning[] = [];
    const projectEndKey = toDateKey(projectEndDate);

    for (const t of scheduled) {
      if (t.skipped || !t.scheduledEndDate) continue;
      const endKey = toDateKey(t.scheduledEndDate);
      if (endKey > projectEndKey) {
        warnings.push({
          kind: "EXCEEDS_PROJECT_END",
          taskId: t.taskId,
          taskNo: t.taskNo,
          taskName: t.taskName,
          detail: `予定終了日(${endKey})がプロジェクト終了日(${projectEndKey})を超えています`,
        });
      }
    }

    return warnings;
  }
}
