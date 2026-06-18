import type { SchedulingTask } from "./scheduling-task";
import type { SchedulingOptions } from "./scheduling-options";
import type { ScheduledTask, ScheduledPredecessor } from "./scheduled-result";
import type {
  TaskDependency,
  DependencyType,
} from "@/domains/task-dependency/task-dependency";
import { isSteadyTask } from "./steady-task-classifier";
import { topologicalSort, type TopoEdge } from "./topological-sort";
import {
  type WorkingCalendar,
  nextAvailableDay,
  nextBusinessDay,
  consumeUntilDone,
  countWorkingDays,
  addCalendarDays,
  toDateKey,
} from "./working-calendar-walker";

export interface ForwardSchedulerInput {
  tasks: SchedulingTask[];
  dependencies: TaskDependency[];
  /** assigneeId(wbs_assignee.id) → 稼働カレンダー */
  calendars: Map<number, WorkingCalendar>;
  standardWorkingHours: number;
  options: SchedulingOptions;
}

const STEADY_MAX_DAYS = 366 * 5;

/**
 * 依存関係・担当者稼働・定常タスク・ステータスを考慮した前詰めスケジューリング。
 */
export function forwardSchedule(input: ForwardSchedulerInput): ScheduledTask[] {
  const { tasks, dependencies, calendars, standardWorkingHours, options } =
    input;
  const { baselineDate, steadyTaskKeywords } = options;

  const taskById = new Map<number, SchedulingTask>();
  for (const t of tasks) taskById.set(t.taskId, t);

  const predecessorsOf = new Map<number, ScheduledPredecessor[]>();
  for (const d of dependencies) {
    const list = predecessorsOf.get(d.successorTaskId) ?? [];
    list.push({ taskId: d.predecessorTaskId, type: d.type, lag: d.lag });
    predecessorsOf.set(d.successorTaskId, list);
  }

  const result = new Map<number, ScheduledTask>();

  const baseResult = (t: SchedulingTask): ScheduledTask => ({
    taskId: t.taskId,
    taskNo: t.taskNo,
    taskName: t.taskName,
    phaseId: t.phaseId,
    phaseName: t.phaseName,
    assigneeId: t.assigneeId,
    assigneeName: t.assigneeName,
    status: t.status,
    isSteady: false,
    fixed: false,
    skipped: false,
    note: "NORMAL",
    predecessors: predecessorsOf.get(t.taskId) ?? [],
  });

  // 担当者ごとの定常消費 consumed: assigneeId -> (dateKey -> hours)
  const consumed = new Map<number, Map<string, number>>();
  const consumedOf = (assigneeId: number): Map<string, number> => {
    let m = consumed.get(assigneeId);
    if (!m) {
      m = new Map();
      consumed.set(assigneeId, m);
    }
    return m;
  };

  // ---- フェーズA: 計算対象外(skip)と完了固定 ----
  for (const t of tasks) {
    if (t.assigneeId == null) {
      result.set(t.taskId, {
        ...baseResult(t),
        skipped: true,
        note: "NO_ASSIGNEE",
      });
      continue;
    }
    const steady = isSteadyTask(t.taskName, steadyTaskKeywords);
    if (t.status === "COMPLETED") {
      result.set(t.taskId, {
        ...baseResult(t),
        isSteady: steady,
        fixed: true,
        note: "COMPLETED_FIXED",
        scheduledStartDate: t.jissekiStartDate ?? t.yoteiStartDate,
        scheduledEndDate: t.jissekiEndDate ?? t.yoteiEndDate,
        scheduledManHours: t.jissekiKosu ?? t.yoteiKosu,
      });
      continue;
    }
    if (!steady && (t.yoteiKosu == null || t.yoteiKosu <= 0)) {
      result.set(t.taskId, {
        ...baseResult(t),
        skipped: true,
        note: "NO_YOTEI_KOSU",
      });
      continue;
    }
  }

  // ---- フェーズB: 定常タスク先置き（前詰めしない） ----
  for (const t of tasks) {
    if (result.has(t.taskId)) continue;
    if (!isSteadyTask(t.taskName, steadyTaskKeywords)) continue;
    if (!t.yoteiStartDate || !t.yoteiEndDate) {
      result.set(t.taskId, {
        ...baseResult(t),
        isSteady: true,
        skipped: true,
        note: "STEADY_NO_PERIOD",
      });
      continue;
    }
    result.set(t.taskId, {
      ...baseResult(t),
      isSteady: true,
      note: "STEADY_FIXED_PERIOD",
      scheduledStartDate: t.yoteiStartDate,
      scheduledEndDate: t.yoteiEndDate,
      scheduledManHours: t.yoteiKosu,
    });

    if (options.consumeSteadyTaskCapacity && t.assigneeId != null) {
      const cal = calendars.get(t.assigneeId);
      if (cal) {
        const dailyHours = computeSteadyDailyHours(t, cal, options);
        if (dailyHours > 0) {
          const m = consumedOf(t.assigneeId);
          let cur = new Date(t.yoteiStartDate);
          let iter = 0;
          while (
            cur.getTime() <= t.yoteiEndDate.getTime() &&
            iter < STEADY_MAX_DAYS
          ) {
            if (cal.getAvailableHours(cur) > 0) {
              const key = toDateKey(cur);
              m.set(key, (m.get(key) ?? 0) + dailyHours);
            }
            cur = addCalendarDays(cur, 1);
            iter++;
          }
        }
      }
    }
  }

  // ---- フェーズC: 通常タスクをトポロジカル順に前詰め ----
  const normalIds = tasks
    .filter((t) => !result.has(t.taskId))
    .map((t) => t.taskId);
  const normalIdSet = new Set(normalIds);
  const edges: TopoEdge[] = dependencies
    .filter(
      (d) =>
        normalIdSet.has(d.predecessorTaskId) &&
        normalIdSet.has(d.successorTaskId)
    )
    .map((d) => ({ from: d.predecessorTaskId, to: d.successorTaskId }));
  const topo = topologicalSort(normalIds, edges);
  const cyclicSet = new Set(topo.cyclicNodes);

  const assigneeFreeFrom = new Map<number, Date>();

  for (const taskId of [...topo.ordered, ...topo.cyclicNodes]) {
    const t = taskById.get(taskId)!;
    const r = baseResult(t);

    if (cyclicSet.has(taskId)) {
      result.set(taskId, { ...r, skipped: true, note: "CYCLIC" });
      continue;
    }

    const assigneeId = t.assigneeId!;
    const cal = calendars.get(assigneeId);
    if (!cal) {
      result.set(taskId, { ...r, skipped: true, note: "NO_ASSIGNEE" });
      continue;
    }

    let remaining: number;
    let note: ScheduledTask["note"] = "NORMAL";
    if (t.status === "IN_PROGRESS") {
      remaining = Math.max(0, (t.yoteiKosu ?? 0) - (t.jissekiKosu ?? 0));
      note = "IN_PROGRESS_REMAINING";
    } else {
      remaining = t.yoteiKosu ?? 0;
    }

    // 依存制約による最早開始下限
    let startLB = baselineDate;
    for (const p of predecessorsOf.get(taskId) ?? []) {
      const pr = result.get(p.taskId);
      if (!pr || pr.skipped || !pr.scheduledStartDate || !pr.scheduledEndDate) {
        continue;
      }
      const impl = impliedStart(
        p.type,
        p.lag,
        pr.scheduledStartDate,
        pr.scheduledEndDate,
        estimatedDurationDays(t, standardWorkingHours)
      );
      if (impl.getTime() > startLB.getTime()) startLB = impl;
    }
    // 同一担当者の稼働列制約
    const freeFrom = assigneeFreeFrom.get(assigneeId);
    if (freeFrom && freeFrom.getTime() > startLB.getTime()) startLB = freeFrom;

    const cons = consumedOf(assigneeId);
    const start = nextAvailableDay(startLB, cal, cons);

    if (remaining <= 0) {
      result.set(taskId, {
        ...r,
        note,
        scheduledStartDate: start,
        scheduledEndDate: start,
        scheduledManHours: 0,
      });
      assigneeFreeFrom.set(assigneeId, nextBusinessDay(start, cal, cons));
      continue;
    }

    const { endDate, overflow } = consumeUntilDone(start, remaining, cal, cons);
    result.set(taskId, {
      ...r,
      note: overflow ? "SCHEDULE_OVERFLOW" : note,
      scheduledStartDate: start,
      scheduledEndDate: endDate,
      scheduledManHours: remaining,
    });
    assigneeFreeFrom.set(assigneeId, nextBusinessDay(endDate, cal, cons));
  }

  // 元のtask順をベースに、開始日→taskNoでソートして返す
  const out: ScheduledTask[] = [];
  for (const t of tasks) {
    const r = result.get(t.taskId);
    if (r) out.push(r);
  }
  out.sort(compareScheduled);
  return out;
}

/** 定常タスクの日次消費量を決める（FIXED指定があれば固定値、無ければ予定工数を稼働日数で按分） */
function computeSteadyDailyHours(
  t: SchedulingTask,
  cal: WorkingCalendar,
  options: SchedulingOptions
): number {
  if (
    options.steadyDailyHoursMode === "FIXED" &&
    options.steadyFixedHoursByKeyword
  ) {
    const kw = options.steadyTaskKeywords.find(
      (k) => k.length > 0 && t.taskName.includes(k)
    );
    if (kw && options.steadyFixedHoursByKeyword[kw] != null) {
      return options.steadyFixedHoursByKeyword[kw];
    }
  }
  if (!t.yoteiStartDate || !t.yoteiEndDate) return 0;
  const workingDays = countWorkingDays(t.yoteiStartDate, t.yoteiEndDate, cal);
  if (workingDays <= 0) return 0;
  return (t.yoteiKosu ?? 0) / workingDays;
}

/** 後続タスクの仮の所要営業日数（FF/SF の開始下限近似に使用） */
function estimatedDurationDays(
  t: SchedulingTask,
  standardWorkingHours: number
): number {
  const kosu = t.yoteiKosu ?? 0;
  if (kosu <= 0 || standardWorkingHours <= 0) return 1;
  return Math.max(1, Math.ceil(kosu / standardWorkingHours));
}

/**
 * 依存種別と lag(カレンダー日)から後続タスクの最早開始下限を求める。
 * FS/SS は厳密、FF/SF は後続の仮 duration を用いた近似。
 */
function impliedStart(
  type: DependencyType,
  lag: number,
  predStart: Date,
  predEnd: Date,
  durationDays: number
): Date {
  switch (type) {
    case "FS":
      return addCalendarDays(predEnd, 1 + lag);
    case "SS":
      return addCalendarDays(predStart, lag);
    case "FF":
      return addCalendarDays(predEnd, lag - durationDays + 1);
    case "SF":
      return addCalendarDays(predStart, lag - durationDays + 1);
    default:
      return addCalendarDays(predEnd, 1 + lag);
  }
}

function compareScheduled(a: ScheduledTask, b: ScheduledTask): number {
  const ad = a.scheduledStartDate?.getTime() ?? Number.POSITIVE_INFINITY;
  const bd = b.scheduledStartDate?.getTime() ?? Number.POSITIVE_INFINITY;
  if (ad !== bd) return ad - bd;
  return a.taskNo.localeCompare(b.taskNo, undefined, { numeric: true });
}
