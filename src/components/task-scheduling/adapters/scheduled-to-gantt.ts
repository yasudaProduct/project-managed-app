import type { ScheduledTaskDto } from "@/applications/task-scheduling/ischeduling-application-service";
import type { Task as GanttTask, GanttPhase } from "@/components/ganttv3/gantt";
import { phaseColor } from "@/components/ganttv3/utils/phase-colors";

/** phaseId → 出現順インデックス（色割当に使用） */
function buildPhaseOrder(dtos: ScheduledTaskDto[]): Map<number, number> {
  const order = new Map<number, number>();
  let idx = 0;
  for (const d of dtos) {
    if (d.phaseId != null && !order.has(d.phaseId)) {
      order.set(d.phaseId, idx++);
    }
  }
  return order;
}

/**
 * スケジューリング結果(DTO)を ganttv3 の Task[] に変換する。
 * 日付未確定/skipタスクは timelineBounds の NaN を避けるため除外する。
 */
export function scheduledToGanttTasks(dtos: ScheduledTaskDto[]): GanttTask[] {
  const phaseOrder = buildPhaseOrder(dtos);
  return dtos
    .filter((d) => !d.skipped && d.scheduledStartDate && d.scheduledEndDate)
    .map((d) => ({
      id: String(d.taskId),
      name: d.taskName,
      startDate: new Date(d.scheduledStartDate!),
      endDate: new Date(d.scheduledEndDate!),
      duration: d.scheduledManHours ?? 0,
      color: phaseColor(d.phaseId != null ? phaseOrder.get(d.phaseId) ?? 0 : 0),
      isMilestone: false,
      progress: 0,
      predecessors: d.predecessors.map((p) => ({
        taskId: String(p.taskId),
        type: p.type,
        lag: p.lag,
      })),
      level: 0,
      isManuallyScheduled: false,
      category: d.phaseName,
      status: d.status,
      assignee: d.assigneeName,
      dbId: d.taskId,
      assigneeId: d.assigneeId,
      phaseId: d.phaseId,
      taskNo: d.taskNo,
    }));
}

/**
 * ganttv3 上での編集（日付ドラッグ・インライン編集）を ScheduledTaskDto へ逆反映する。
 * 対象は dbId(=taskId) が一致するDTOのみ。非破壊で新しい配列を返す。
 */
export function applyGanttTaskToScheduled(
  dtos: ScheduledTaskDto[],
  edited: GanttTask
): ScheduledTaskDto[] {
  if (edited.dbId == null || !dtos.some((d) => d.taskId === edited.dbId)) {
    return dtos;
  }
  return dtos.map((d) =>
    d.taskId === edited.dbId
      ? {
          ...d,
          scheduledStartDate: edited.startDate.toISOString(),
          scheduledEndDate: edited.endDate.toISOString(),
          scheduledManHours: edited.duration,
          assigneeId: edited.assigneeId,
          assigneeName: edited.assignee,
        }
      : d
  );
}

/**
 * スケジューリング結果に含まれる担当者から、インライン編集パネルの
 * 担当者プルダウン選択肢（wbs_assignee.id ベース）を生成する。
 */
export function scheduledToAssigneeOptions(
  dtos: ScheduledTaskDto[]
): { id: number; name: string }[] {
  const options: { id: number; name: string }[] = [];
  const seen = new Set<number>();
  for (const d of dtos) {
    if (d.assigneeId == null || seen.has(d.assigneeId)) continue;
    seen.add(d.assigneeId);
    options.push({ id: d.assigneeId, name: d.assigneeName ?? String(d.assigneeId) });
  }
  return options;
}

/** スケジューリング結果から ganttv3 のフェーズ(カテゴリ)一覧を生成する */
export function scheduledToGanttPhases(dtos: ScheduledTaskDto[]): GanttPhase[] {
  const order = buildPhaseOrder(dtos);
  const phases: GanttPhase[] = [];
  const seen = new Set<number>();
  for (const d of dtos) {
    if (d.phaseId == null || seen.has(d.phaseId)) continue;
    seen.add(d.phaseId);
    phases.push({
      id: String(d.phaseId),
      name: d.phaseName ?? `フェーズ${d.phaseId}`,
      color: phaseColor(order.get(d.phaseId) ?? 0),
    });
  }
  return phases;
}
