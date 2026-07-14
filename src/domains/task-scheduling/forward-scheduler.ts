import type { SchedulingTask } from "./scheduling-task";
import type { SchedulingOptions } from "./scheduling-options";
import type { ScheduledTask, ScheduledPredecessor } from "./scheduled-result";
import type {
  TaskDependency,
  DependencyType,
} from "@/domains/task-dependency/task-dependency";
import { isSteadyTask } from "./steady-task-classifier";
import { isFixedDateTask } from "./fixed-date-task-classifier";
import { topologicalSort, type TopoEdge } from "./topological-sort";
import {
  type WorkingCalendar,
  nextAvailableDay,
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
  /**
   * 他WBS等による事前消費 assigneeId(wbs_assignee.id) → (dateKey 'YYYY-MM-DD' → hours)。
   * 内部でコピーするため呼び出し側のMapは変更されない。
   * 定常タスクの先行消費と同様に、通常タスクは外部負荷の占有時間を避けて前詰めされる。
   */
  externalConsumed?: Map<number, Map<string, number>>;
}

const MAX_PERIOD_DAYS = 366 * 5;

/**
 * タスクの日次消費量を期間内の各稼働日に加算し、担当者の消費マップへ反映する。
 * 前詰めしないタスク（実施日固定・定常）が担当者の稼働を占有していることを、
 * 後続の通常タスクの前詰めへ反映するために使う。
 */
function consumePeriodCapacity(
  periodStart: Date,
  periodEnd: Date,
  dailyHours: number,
  cal: WorkingCalendar,
  consumed: Map<string, number>
): void {
  if (dailyHours <= 0) return;
  let cur = new Date(periodStart);
  let iter = 0;
  while (cur.getTime() <= periodEnd.getTime() && iter < MAX_PERIOD_DAYS) {
    if (cal.getAvailableHours(cur) > 0) {
      const key = toDateKey(cur);
      consumed.set(key, (consumed.get(key) ?? 0) + dailyHours);
    }
    cur = addCalendarDays(cur, 1);
    iter++;
  }
}

/**
 * 依存関係・担当者稼働・定常タスク・ステータスを考慮した前詰めスケジューリング。
 */
export function forwardSchedule(input: ForwardSchedulerInput): ScheduledTask[] {
  const { tasks, dependencies, calendars, standardWorkingHours, options } =
    input;
  const { baselineDate, steadyTaskKeywords, fixedDateTaskKeywords } = options;

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
  // 他WBS等の外部消費を事前シード(呼び出し側のMapを汚さないようコピーする)
  if (input.externalConsumed) {
    for (const [assigneeId, dailyHours] of input.externalConsumed) {
      consumed.set(assigneeId, new Map(dailyHours));
    }
  }
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
    const fixedDate = isFixedDateTask(t.taskName, fixedDateTaskKeywords);
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
    // 定常・実施日固定タスクはマイルストーン的に工数0でも配置するため対象外
    if (!steady && !fixedDate && (t.yoteiKosu == null || t.yoteiKosu <= 0)) {
      result.set(t.taskId, {
        ...baseResult(t),
        skipped: true,
        note: "NO_YOTEI_KOSU",
      });
      continue;
    }
  }

  // ---- フェーズA2: 実施日固定タスクを開始日固定・終了日算出で配置（前詰めしない） ----
  // 本番導入・定例会など実施日が確定しているタスクは、前詰めの対象から外し
  // 入力済みの予定開始日をそのまま採用する（非稼働日でも動かさない）。定常判定より優先する。
  // 終了日は予定工数を開始日以降の稼働可能時間で消化して算出し、算出終了日が
  // 入力された終了日を超える場合は FIXED_PERIOD_EXCEEDED として警告する（日付は算出値のまま）。
  for (const t of tasks) {
    if (result.has(t.taskId)) continue;
    if (!isFixedDateTask(t.taskName, fixedDateTaskKeywords)) continue;
    if (!t.yoteiStartDate || !t.yoteiEndDate) {
      result.set(t.taskId, {
        ...baseResult(t),
        skipped: true,
        note: "FIXED_NO_PERIOD",
      });
      continue;
    }
    const kosu = t.yoteiKosu ?? 0;
    const cal = t.assigneeId != null ? calendars.get(t.assigneeId) : undefined;
    if (kosu <= 0 || !cal) {
      // 工数が無い（マイルストーン等）またはカレンダー未登録なら終了日を算出できない
      // ため、入力された期間をそのまま採用する
      result.set(t.taskId, {
        ...baseResult(t),
        note: "FIXED_DATE",
        scheduledStartDate: t.yoteiStartDate,
        scheduledEndDate: t.yoteiEndDate,
        scheduledManHours: kosu,
      });
      continue;
    }

    // 固定タスクは一回性の確定作業であり、通常タスク同様に担当者の稼働を消費する。
    // consumeUntilDone が消化分を consumed に記録するため、同一担当者の通常タスクは
    // 固定タスクの占有時間を避けて前詰めされる。
    const { endDate, overflow } = consumeUntilDone(
      t.yoteiStartDate,
      kosu,
      cal,
      consumedOf(t.assigneeId!)
    );
    const exceeded = endDate.getTime() > t.yoteiEndDate.getTime();
    result.set(t.taskId, {
      ...baseResult(t),
      note: overflow
        ? "SCHEDULE_OVERFLOW"
        : exceeded
          ? "FIXED_PERIOD_EXCEEDED"
          : "FIXED_DATE",
      scheduledStartDate: t.yoteiStartDate,
      scheduledEndDate: endDate,
      scheduledManHours: kosu,
    });
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
        consumePeriodCapacity(
          t.yoteiStartDate,
          t.yoteiEndDate,
          computeSteadyDailyHours(t, cal, options),
          cal,
          consumedOf(t.assigneeId)
        );
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
    const predLB = predecessorLowerBound(
      taskId,
      t,
      predecessorsOf,
      result,
      standardWorkingHours
    );
    if (predLB && predLB.getTime() > startLB.getTime()) startLB = predLB;
    // 同一担当者の稼働列制約
    const freeFrom = assigneeFreeFrom.get(assigneeId);
    if (freeFrom && freeFrom.getTime() > startLB.getTime()) startLB = freeFrom;

    const cons = consumedOf(assigneeId);
    const start = nextAvailableDay(startLB, cal, cons);

    if (remaining <= 0) {
      // 工数0は稼働を消費しないため、同日の残余をそのまま次タスクへ渡す
      result.set(taskId, {
        ...r,
        note,
        scheduledStartDate: start,
        scheduledEndDate: start,
        scheduledManHours: 0,
      });
      assigneeFreeFrom.set(assigneeId, start);
      continue;
    }

    // consumeUntilDone が消化分を cons に記録するため、終了日に残余稼働があれば
    // 同一担当者の次タスクは同日から開始できる（nextAvailableDay が残余0の日をスキップ）
    const { endDate, overflow } = consumeUntilDone(start, remaining, cal, cons);
    result.set(taskId, {
      ...r,
      note: overflow ? "SCHEDULE_OVERFLOW" : note,
      scheduledStartDate: start,
      scheduledEndDate: endDate,
      scheduledManHours: remaining,
    });
    assigneeFreeFrom.set(assigneeId, endDate);
  }

  // ---- フェーズD: 実施日固定タスクの先行超過を検出 ----
  // 先行タスクの算出結果が固定開始日より後ろへずれ込む場合、前工程が固定日に
  // 間に合わない競合として note を FIXED_DATE_CONFLICT に更新する（日付はそのまま）。
  // 期間超過(FIXED_PERIOD_EXCEEDED)と競合が重なる場合はリスケ判断上より重要な競合を優先する。
  const conflictIds: number[] = [];
  for (const [taskId, r] of result) {
    if (
      (r.note !== "FIXED_DATE" && r.note !== "FIXED_PERIOD_EXCEEDED") ||
      !r.scheduledStartDate
    ) {
      continue;
    }
    const t = taskById.get(taskId);
    if (!t) continue;
    const predLB = predecessorLowerBound(
      taskId,
      t,
      predecessorsOf,
      result,
      standardWorkingHours
    );
    if (predLB && predLB.getTime() > r.scheduledStartDate.getTime()) {
      conflictIds.push(taskId);
    }
  }
  for (const taskId of conflictIds) {
    const r = result.get(taskId)!;
    result.set(taskId, { ...r, note: "FIXED_DATE_CONFLICT" });
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

/** タスクの仮の所要営業日数（FF/SF の開始下限近似、固定タスクの先行超過判定に使用） */
function estimatedDurationDays(
  t: SchedulingTask,
  standardWorkingHours: number
): number {
  const kosu = t.yoteiKosu ?? 0;
  if (kosu <= 0 || standardWorkingHours <= 0) return 1;
  return Math.max(1, Math.ceil(kosu / standardWorkingHours));
}

/**
 * 先行タスクの確定結果から taskId の最早開始下限を求める（未確定の先行は無視）。
 * 先行が無い、または全先行が未確定なら undefined。
 * フェーズC（通常タスクの開始下限）とフェーズD（固定タスクの先行超過検出）で共用する。
 */
function predecessorLowerBound(
  taskId: number,
  t: SchedulingTask,
  predecessorsOf: Map<number, ScheduledPredecessor[]>,
  result: Map<number, ScheduledTask>,
  standardWorkingHours: number
): Date | undefined {
  let lb: Date | undefined;
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
    if (!lb || impl.getTime() > lb.getTime()) lb = impl;
  }
  return lb;
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
