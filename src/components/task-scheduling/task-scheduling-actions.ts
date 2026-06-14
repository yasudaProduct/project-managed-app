"use server";

import { container } from "@/lib/inversify.config";
import { SYMBOL } from "@/types/symbol";
import { ITaskSchedulingApplicationService } from "@/applications/task-scheduling/itask-scheduling-application.service";
import { TaskSchedulingResult } from "@/applications/task-scheduling/task-scheduling-application.service";
import { getPhases } from "@/app/wbs/[id]/ganttv3/action";
import {
  Task as GanttTask,
  GanttPhase,
  TaskStatus as GanttTaskStatus,
} from "@/components/ganttv3/gantt";

export async function calculateTaskSchedules(
  wbsId: number | string,
): Promise<TaskSchedulingResult[]> {
  const taskSchedulingService =
    container.get<ITaskSchedulingApplicationService>(
      SYMBOL.ITaskSchedulingApplicationService,
    );

  const idNum = typeof wbsId === "string" ? Number(wbsId) : wbsId;
  if (Number.isNaN(idNum)) {
    throw new Error("Invalid wbsId");
  }

  return await taskSchedulingService.calculateWbsTaskSchedules(idNum);
}

/** アンカー日（前詰めの起点）の指定方法 */
export type AnchorMode = "projectStart" | "today" | "custom";

export interface ScheduleWithDepsResult {
  /** 一覧/TSV/エラー表示用の生結果 */
  results: TaskSchedulingResult[];
  /** ganttv3 表示用のタスク（スケジュール確定分のみ） */
  ganttTasks: GanttTask[];
  /** ganttv3 のフェーズ（カテゴリ） */
  phases: GanttPhase[];
}

/**
 * タスク依存関係を考慮してスケジュールを計算し、ganttv3 表示用データも併せて返す。
 * DB保存はしない。
 * @param anchorMode 起点（projectStart=プロジェクト開始日 / today=今日 / custom=任意日）
 * @param customDate anchorMode='custom' のときの日付（YYYY-MM-DD）
 */
export async function calculateTaskSchedulesWithDeps(
  wbsId: number | string,
  anchorMode: AnchorMode = "projectStart",
  customDate?: string,
): Promise<ScheduleWithDepsResult> {
  const taskSchedulingService =
    container.get<ITaskSchedulingApplicationService>(
      SYMBOL.ITaskSchedulingApplicationService,
    );

  const idNum = typeof wbsId === "string" ? Number(wbsId) : wbsId;
  if (Number.isNaN(idNum)) {
    throw new Error("Invalid wbsId");
  }

  // アンカー日をサーバ側で解決（projectStart はサービス側で projectStartDate を使う）
  let anchorDate: Date | undefined;
  if (anchorMode === "today") {
    anchorDate = new Date();
  } else if (anchorMode === "custom") {
    if (!customDate) {
      throw new Error("基準日（任意日）が指定されていません");
    }
    anchorDate = new Date(`${customDate}T00:00:00`);
    if (Number.isNaN(anchorDate.getTime())) {
      throw new Error("基準日（任意日）の形式が不正です");
    }
  }

  const [results, phases] = await Promise.all([
    taskSchedulingService.calculateWbsTaskSchedulesWithDependencies(
      idNum,
      anchorDate,
    ),
    getPhases(idNum),
  ]);

  return {
    results,
    ganttTasks: toGanttTasks(results, phases),
    phases,
  };
}

/**
 * スケジュール結果を ganttv3 の Task[] へ変換する。
 * - 開始/終了日が確定したタスクのみ対象（エラー/未スケジュールは除外）。
 * - バーの位置は startDate/endDate が決め、duration には予定工数(h)を入れる規約。
 */
function toGanttTasks(
  results: TaskSchedulingResult[],
  phases: GanttPhase[],
): GanttTask[] {
  const colorById = new Map<number, string>();
  const nameById = new Map<number, string>();
  for (const p of phases) {
    colorById.set(Number(p.id), p.color);
    nameById.set(Number(p.id), p.name);
  }

  // 矢印を結ぶため、スケジュール確定済みのタスクIDを把握
  const scheduledIds = new Set(
    results
      .filter((r) => r.plannedStartDate && r.plannedEndDate)
      .map((r) => String(r.taskId)),
  );

  return results
    .filter((r) => r.plannedStartDate && r.plannedEndDate)
    .map((r) => ({
      id: String(r.taskId),
      name: r.taskName,
      startDate: r.plannedStartDate!,
      endDate: r.plannedEndDate!,
      duration: r.plannedManHours ?? 0,
      color:
        (r.phaseId != null ? colorById.get(r.phaseId) : undefined) ?? "#6B7280",
      isMilestone: false,
      progress: 0,
      // 先行が確定済みのものだけ矢印対象にする
      predecessors: (r.predecessors ?? [])
        .filter((p) => scheduledIds.has(String(p.taskId)))
        .map((p) => ({
          taskId: String(p.taskId),
          type: p.type,
          lag: p.lag,
        })),
      level: 0,
      isManuallyScheduled: false,
      category:
        (r.phaseId != null ? nameById.get(r.phaseId) : undefined) ??
        r.phaseName,
      assignee: r.assigneeName,
      status: r.status as GanttTaskStatus | undefined,
      assigneeId: r.assigneeId,
      assigneeSeq: r.assigneeSeq,
      phaseId: r.phaseId,
      taskNo: r.taskNo,
      dbId: r.taskId,
    }));
}
