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
  consumeBackward,
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

const MAX_PERIOD_DAYS = 366 * 5;

/** 後続タスクへの依存参照（predecessorsOf の逆引き） */
interface SuccessorRef {
  taskId: number;
  type: DependencyType;
  lag: number;
}

/** このスケジュールで消化すべき工数（進行中は残工数、それ以外は予定工数） */
function remainingHours(t: SchedulingTask): number {
  if (t.status === "IN_PROGRESS") {
    return Math.max(0, (t.yoteiKosu ?? 0) - (t.jissekiKosu ?? 0));
  }
  return t.yoteiKosu ?? 0;
}

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
  const successorsOf = new Map<number, SuccessorRef[]>();
  for (const d of dependencies) {
    const list = predecessorsOf.get(d.successorTaskId) ?? [];
    list.push({ taskId: d.predecessorTaskId, type: d.type, lag: d.lag });
    predecessorsOf.set(d.successorTaskId, list);
    const succs = successorsOf.get(d.predecessorTaskId) ?? [];
    succs.push({ taskId: d.successorTaskId, type: d.type, lag: d.lag });
    successorsOf.set(d.predecessorTaskId, succs);
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

  // ---- フェーズA2: 実施日固定タスクを予定期間で固定（前詰めしない） ----
  // 本番導入・定例会など実施日が確定しているタスクは、前詰めの対象から外し
  // 入力済みのYOTEI期間をそのまま採用する。定常判定より優先する。
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
    result.set(t.taskId, {
      ...baseResult(t),
      note: "FIXED_DATE",
      scheduledStartDate: t.yoteiStartDate,
      scheduledEndDate: t.yoteiEndDate,
      scheduledManHours: t.yoteiKosu ?? 0,
    });

    // 固定タスクは一回性の確定作業であり、通常タスク同様に担当者の稼働を消費する。
    // 予定工数を固定期間内の稼働日へ按分し、同一担当者の通常タスクが固定タスクの
    // 占有時間を避けて前詰めされるようにする。
    if (t.assigneeId != null) {
      const cal = calendars.get(t.assigneeId);
      if (cal) {
        const workingDays = countWorkingDays(
          t.yoteiStartDate,
          t.yoteiEndDate,
          cal
        );
        const dailyHours =
          workingDays > 0 ? (t.yoteiKosu ?? 0) / workingDays : 0;
        consumePeriodCapacity(
          t.yoteiStartDate,
          t.yoteiEndDate,
          dailyHours,
          cal,
          consumedOf(t.assigneeId)
        );
      }
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

  // ---- フェーズB2: 実施日固定タスクの先行チェーンを固定日から逆算配置 ----
  // 固定タスクの先行チェーン（未確定の通常タスク）を、後続の確定日程から導いた
  // 最遅終了日を締切として後方から工数消費し、固定日に間に合う最遅日程で配置する。
  // 基準日より前に食い込む（＝物理的に間に合わない）タスクは逆算せず、
  // 従来どおりフェーズCで前詰めし、フェーズDで FIXED_DATE_CONFLICT として検出する。
  const backwardChainIds = new Set<number>();
  {
    const queue: number[] = [];
    for (const [taskId, r] of result) {
      if (r.note === "FIXED_DATE") queue.push(taskId);
    }
    while (queue.length > 0) {
      const id = queue.pop()!;
      for (const p of predecessorsOf.get(id) ?? []) {
        if (backwardChainIds.has(p.taskId)) continue;
        // 確定済み（完了/固定/定常/skip）のタスクで遡上を止める
        if (result.has(p.taskId) || !taskById.has(p.taskId)) continue;
        backwardChainIds.add(p.taskId);
        queue.push(p.taskId);
      }
    }
  }
  const chainEdges: TopoEdge[] = dependencies
    .filter(
      (d) =>
        backwardChainIds.has(d.predecessorTaskId) &&
        backwardChainIds.has(d.successorTaskId)
    )
    .map((d) => ({ from: d.predecessorTaskId, to: d.successorTaskId }));
  const chainTopo = topologicalSort([...backwardChainIds], chainEdges);
  // 逆トポロジカル順（後続→先行）に締切を伝播させる。循環はフェーズCでCYCLIC扱い
  for (const taskId of [...chainTopo.ordered].reverse()) {
    const t = taskById.get(taskId)!;
    const cal = t.assigneeId != null ? calendars.get(t.assigneeId) : undefined;
    if (!cal) continue; // カレンダー未登録はフェーズCで NO_ASSIGNEE skip

    const deadline = successorUpperBound(
      taskId,
      t,
      successorsOf,
      result,
      standardWorkingHours
    );
    if (!deadline) continue; // 締切を導けない場合は前詰めへ

    const cons = consumedOf(t.assigneeId!);
    const placed = consumeBackward(
      deadline,
      remainingHours(t),
      cal,
      cons,
      baselineDate
    );
    if (!placed) continue; // 基準日までに収まらない → 前詰めフォールバック

    for (const [key, hours] of placed.delta) {
      cons.set(key, (cons.get(key) ?? 0) + hours);
    }
    result.set(taskId, {
      ...baseResult(t),
      note: "BACKWARD_FROM_FIXED",
      scheduledStartDate: placed.startDate,
      scheduledEndDate: placed.endDate,
      scheduledManHours: remainingHours(t),
    });
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

    const remaining = remainingHours(t);
    const note: ScheduledTask["note"] =
      t.status === "IN_PROGRESS" ? "IN_PROGRESS_REMAINING" : "NORMAL";

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

  // ---- フェーズD: 実施日固定・逆算タスクの先行超過を検出 ----
  // 先行タスクの算出結果が固定/逆算配置の開始日より後ろへずれ込む場合、前工程が
  // 固定日に間に合わない競合として note を FIXED_DATE_CONFLICT に更新する
  // （日付は変更しない）。競合は依存の下流にある固定・逆算タスクへも伝播させ、
  // 固定日に間に合わないリスクの連鎖を明示する。
  const conflictIds: number[] = [];
  for (const [taskId, r] of result) {
    if (
      (r.note !== "FIXED_DATE" && r.note !== "BACKWARD_FROM_FIXED") ||
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
  const conflictSet = new Set(conflictIds);
  {
    const queue = [...conflictIds];
    while (queue.length > 0) {
      const id = queue.pop()!;
      for (const s of successorsOf.get(id) ?? []) {
        if (conflictSet.has(s.taskId)) continue;
        const sr = result.get(s.taskId);
        if (!sr) continue;
        if (sr.note === "FIXED_DATE" || sr.note === "BACKWARD_FROM_FIXED") {
          conflictSet.add(s.taskId);
          queue.push(s.taskId);
        }
      }
    }
  }
  for (const taskId of conflictSet) {
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
 * 後続タスクの確定結果から taskId の最遅終了日（締切）を求める（未確定の後続は無視）。
 * 後続が無い、または全後続が未確定なら undefined。
 * フェーズB2（固定タスクの先行チェーン逆算）で使用する。
 */
function successorUpperBound(
  taskId: number,
  t: SchedulingTask,
  successorsOf: Map<number, SuccessorRef[]>,
  result: Map<number, ScheduledTask>,
  standardWorkingHours: number
): Date | undefined {
  let ub: Date | undefined;
  for (const s of successorsOf.get(taskId) ?? []) {
    const sr = result.get(s.taskId);
    if (!sr || sr.skipped || !sr.scheduledStartDate || !sr.scheduledEndDate) {
      continue;
    }
    const impl = impliedLatestEnd(
      s.type,
      s.lag,
      sr.scheduledStartDate,
      sr.scheduledEndDate,
      estimatedDurationDays(t, standardWorkingHours)
    );
    if (!ub || impl.getTime() < ub.getTime()) ub = impl;
  }
  return ub;
}

/**
 * 依存種別と lag(カレンダー日)から先行タスクの最遅終了日を求める（impliedStart の逆）。
 * FS/FF は厳密、SS/SF は開始日制約のため先行の仮 duration を用いた近似。
 */
function impliedLatestEnd(
  type: DependencyType,
  lag: number,
  succStart: Date,
  succEnd: Date,
  durationDays: number
): Date {
  switch (type) {
    case "FS":
      return addCalendarDays(succStart, -(1 + lag));
    case "SS":
      return addCalendarDays(succStart, -lag + durationDays - 1);
    case "FF":
      return addCalendarDays(succEnd, -lag);
    case "SF":
      return addCalendarDays(succEnd, -lag + durationDays - 1);
    default:
      return addCalendarDays(succStart, -(1 + lag));
  }
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
