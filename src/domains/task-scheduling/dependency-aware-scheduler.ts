import { DependencyType } from "@/domains/task-dependency/task-dependency";

/**
 * 依存関係対応フォワードスケジューラ（純粋関数）
 *
 * - トポロジカル順（先行→後続）にタスクを並べ、各タスクの開始日を
 *   「依存制約・資源制約（担当者の前タスク終了）・アンカー日」の最大値に決める。
 * - 工数は担当者の稼働カレンダー（稼働可能時間/日）で消化して終了日を求める。
 * - lag は「営業日」として扱う（稼働日でカウント）。
 * - サイクル（循環依存）は検出してエラーにし、サイクル外は部分結果を確定する。
 *
 * カレンダーは {@link WorkingCalendar} として外から注入する（テスト容易性・疎結合）。
 */

/** スケジューラが必要とする稼働カレンダーの最小インターフェース */
export interface WorkingCalendar {
  /** その日に稼働可能な時間（0 なら稼働不可日） */
  getAvailableHours(date: Date): number;
}

/**
 * タスクのスケジューリング方法
 * - SCHEDULE: 通常どおり前詰めで開始・終了を算出（既定）
 * - FIXED: 開始・終了を固定（完了タスクなど。再計算しない）
 * - PARTIAL: 開始は固定し、残工数をアンカー日から消化して終了だけ再計算（着手中タスク）
 */
export type TaskSchedulingMode = "SCHEDULE" | "FIXED" | "PARTIAL";

/** スケジュール対象タスク（依存・カレンダーは別途渡す） */
export interface SchedulableTask {
  taskId: number;
  taskNo: string;
  assigneeId?: number;
  manHours?: number;
  /** スケジューリング方法（既定 SCHEDULE。リスケ時に FIXED/PARTIAL を指定） */
  schedulingMode?: TaskSchedulingMode;
  /** FIXED/PARTIAL の開始日（実績開始など） */
  fixedStart?: Date;
  /** FIXED の終了日（実績終了など） */
  fixedEnd?: Date;
  /** PARTIAL の残工数（アンカー日から消化して終了を再計算） */
  remainingHours?: number;
}

/** 依存辺（lag は営業日） */
export interface DependencyEdge {
  predId: number;
  succId: number;
  type: DependencyType;
  lag: number;
}

export type ScheduleErrorCode =
  | "CYCLE"
  | "NO_ASSIGNEE"
  | "NO_MANHOURS"
  | "CALENDAR_UNAVAILABLE";

export interface ScheduleInput {
  tasks: SchedulableTask[];
  dependencies: DependencyEdge[];
  /** 前詰めの起点（0時正規化していなくても内部で正規化する） */
  anchorDate: Date;
  /** assigneeId から稼働カレンダーを引く */
  calendarOf: (assigneeId: number) => WorkingCalendar | undefined;
  /** 標準稼働時間/日（FF/SF の所要日数概算に使用） */
  standardWorkingHours: number;
}

export interface ScheduledRange {
  start: Date;
  end: Date;
}

export interface ScheduleOutput {
  scheduled: Map<number, ScheduledRange>;
  errors: Map<number, ScheduleErrorCode>;
  cycleTaskIds: Set<number>;
}

// 稼働日を辿る際の暴走ガード（約10年）
const MAX_DAYS_GUARD = 366 * 10;

// --- 日付ヘルパ（すべてローカルタイムの暦日基準・0時正規化） ---

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function addCalendarDays(d: Date, n: number): Date {
  const r = startOfDay(d);
  r.setDate(r.getDate() + n);
  return r;
}

function canWork(cal: WorkingCalendar, date: Date): boolean {
  return cal.getAvailableHours(date) > 0;
}

/** date 当日を含め、最初の稼働日を返す（見つからなければ null） */
function firstWorkingDayOnOrAfter(
  cal: WorkingCalendar,
  date: Date,
): Date | null {
  let d = startOfDay(date);
  for (let i = 0; i < MAX_DAYS_GUARD; i++) {
    if (canWork(cal, d)) return d;
    d = addCalendarDays(d, 1);
  }
  return null;
}

/** date より後（翌日以降）で最初の稼働日 */
function nextWorkingDay(cal: WorkingCalendar, date: Date): Date | null {
  return firstWorkingDayOnOrAfter(cal, addCalendarDays(date, 1));
}

/** date より前（前日以前）で最初の稼働日 */
function prevWorkingDay(cal: WorkingCalendar, date: Date): Date | null {
  let d = addCalendarDays(date, -1);
  for (let i = 0; i < MAX_DAYS_GUARD; i++) {
    if (canWork(cal, d)) return d;
    d = addCalendarDays(d, -1);
  }
  return null;
}

/**
 * date から n 営業日ずらす。
 * - n>0: date より後の n 番目の稼働日
 * - n=0: date 当日以降で最初の稼働日
 * - n<0: date より前の |n| 番目の稼働日
 */
function shiftBusinessDays(
  cal: WorkingCalendar,
  date: Date,
  n: number,
): Date | null {
  if (n === 0) return firstWorkingDayOnOrAfter(cal, date);
  let d: Date | null = startOfDay(date);
  if (n > 0) {
    for (let k = 0; k < n; k++) {
      d = nextWorkingDay(cal, d);
      if (!d) return null;
    }
  } else {
    for (let k = 0; k < -n; k++) {
      d = prevWorkingDay(cal, d);
      if (!d) return null;
    }
  }
  return d;
}

/**
 * start（稼働日想定）から工数 totalHours を消化し、終了日を返す。
 * 最終日は部分消化でもその日を終了日とする。見つからなければ null。
 */
function consumeHours(
  cal: WorkingCalendar,
  start: Date,
  totalHours: number,
): Date | null {
  let current = startOfDay(start);
  let remaining = totalHours;
  for (let i = 0; i < MAX_DAYS_GUARD; i++) {
    const avail = cal.getAvailableHours(current);
    if (avail > 0) {
      remaining -= avail;
      if (remaining <= 0) return current;
    }
    current = addCalendarDays(current, 1);
  }
  return null;
}

/**
 * 依存制約による後続タスクの最早開始日を求める。
 * FS/SS は開始制約として厳密、FF/SF は後続所要日数の概算で近似する。
 */
function dependencyEarliestStart(
  cal: WorkingCalendar,
  type: DependencyType,
  lag: number,
  predStart: Date,
  predEnd: Date,
  succManHours: number,
  standardWorkingHours: number,
): Date | null {
  switch (type) {
    case "SS":
      // 先行開始から lag 営業日後
      return shiftBusinessDays(cal, predStart, lag);
    case "FS": {
      // 先行終了の翌稼働日から lag 営業日あけて
      const nwd = nextWorkingDay(cal, predEnd);
      if (!nwd) return null;
      return shiftBusinessDays(cal, nwd, lag);
    }
    case "FF": {
      // 後続終了 >= 先行終了 + lag を満たすよう開始下限を逆算（近似）
      const reqEnd = shiftBusinessDays(cal, predEnd, lag);
      if (!reqEnd) return null;
      const durDays = Math.max(
        1,
        Math.ceil(succManHours / standardWorkingHours),
      );
      return shiftBusinessDays(cal, reqEnd, -(durDays - 1));
    }
    case "SF": {
      // 後続終了 >= 先行開始 + lag を満たすよう開始下限を逆算（近似）
      const reqEnd = shiftBusinessDays(cal, predStart, lag);
      if (!reqEnd) return null;
      const durDays = Math.max(
        1,
        Math.ceil(succManHours / standardWorkingHours),
      );
      return shiftBusinessDays(cal, reqEnd, -(durDays - 1));
    }
    default:
      return null;
  }
}

function maxDate(a: Date, b: Date | null): Date {
  return b && b.getTime() > a.getTime() ? b : a;
}

/**
 * 依存関係・資源制約・稼働カレンダーを考慮して前詰めスケジュールを計算する。
 */
export function schedule(input: ScheduleInput): ScheduleOutput {
  const { tasks, dependencies, calendarOf, standardWorkingHours } = input;
  const anchor = startOfDay(input.anchorDate);

  const scheduled = new Map<number, ScheduledRange>();
  const errors = new Map<number, ScheduleErrorCode>();
  const cycleTaskIds = new Set<number>();

  const taskById = new Map<number, SchedulableTask>();
  for (const t of tasks) taskById.set(t.taskId, t);

  // 1. valid 抽出（モード別に必要条件を満たすもの）
  const validIds = new Set<number>();
  for (const t of tasks) {
    const mode = t.schedulingMode ?? "SCHEDULE";
    if (mode === "FIXED") {
      // 開始・終了が確定していれば固定として配置できる
      if (t.fixedStart == null || t.fixedEnd == null) {
        errors.set(t.taskId, "NO_MANHOURS");
        continue;
      }
      validIds.add(t.taskId);
      continue;
    }
    if (t.assigneeId == null) {
      errors.set(t.taskId, "NO_ASSIGNEE");
      continue;
    }
    if (mode === "PARTIAL") {
      // 開始が確定していれば残工数（0以上）で終了を再計算できる
      if (t.fixedStart == null) {
        errors.set(t.taskId, "NO_MANHOURS");
        continue;
      }
      validIds.add(t.taskId);
      continue;
    }
    // SCHEDULE
    if (!t.manHours || t.manHours <= 0) {
      errors.set(t.taskId, "NO_MANHOURS");
      continue;
    }
    validIds.add(t.taskId);
  }

  // 2. グラフ構築（両端 valid・自己ループ除外）
  const edges = dependencies.filter(
    (e) =>
      e.predId !== e.succId &&
      validIds.has(e.predId) &&
      validIds.has(e.succId),
  );
  const predEdges = new Map<number, DependencyEdge[]>();
  const adj = new Map<number, number[]>();
  const inDegree = new Map<number, number>();
  for (const id of validIds) {
    predEdges.set(id, []);
    adj.set(id, []);
    inDegree.set(id, 0);
  }
  for (const e of edges) {
    adj.get(e.predId)!.push(e.succId);
    predEdges.get(e.succId)!.push(e);
    inDegree.set(e.succId, (inDegree.get(e.succId) ?? 0) + 1);
  }

  // 3. Kahn のトポロジカルソート
  //    タイブレーク: 実績で固定される FIXED/PARTIAL を先に処理して資源枠を確保し、
  //    その後 taskNo 自然順（決定的）。
  const modeRank = (id: number): number => {
    const m = taskById.get(id)?.schedulingMode ?? "SCHEDULE";
    return m === "FIXED" ? 0 : m === "PARTIAL" ? 1 : 2;
  };
  const cmpReady = (a: number, b: number) => {
    const r = modeRank(a) - modeRank(b);
    if (r !== 0) return r;
    return (taskById.get(a)?.taskNo ?? "").localeCompare(
      taskById.get(b)?.taskNo ?? "",
      undefined,
      { numeric: true },
    );
  };
  const inDeg = new Map(inDegree);
  const ready: number[] = [...validIds].filter(
    (id) => (inDeg.get(id) ?? 0) === 0,
  );
  const order: number[] = [];
  while (ready.length > 0) {
    ready.sort(cmpReady);
    const id = ready.shift()!;
    order.push(id);
    for (const s of adj.get(id)!) {
      inDeg.set(s, (inDeg.get(s) ?? 0) - 1);
      if ((inDeg.get(s) ?? 0) === 0) ready.push(s);
    }
  }

  // 残留ノード=サイクル（またはサイクル下流）→ 計算不能
  if (order.length < validIds.size) {
    const scheduledOrder = new Set(order);
    for (const id of validIds) {
      if (!scheduledOrder.has(id)) {
        cycleTaskIds.add(id);
        errors.set(id, "CYCLE");
      }
    }
  }

  // 4. 前進スケジューリング
  const assigneeLastEnd = new Map<number, Date>();
  // 担当者タイムラインを前方にのみ進める
  const advanceAssignee = (assigneeId: number | undefined, end: Date) => {
    if (assigneeId == null) return;
    const prev = assigneeLastEnd.get(assigneeId);
    if (!prev || end.getTime() > prev.getTime()) {
      assigneeLastEnd.set(assigneeId, end);
    }
  };

  for (const id of order) {
    const task = taskById.get(id)!;
    const mode = task.schedulingMode ?? "SCHEDULE";

    // 完了タスク等: 開始・終了を固定（再計算しない。後続の依存・資源制約には使う）
    if (mode === "FIXED") {
      const start = task.fixedStart ? startOfDay(task.fixedStart) : null;
      const end = task.fixedEnd ? startOfDay(task.fixedEnd) : start;
      if (!start || !end) {
        errors.set(id, "CALENDAR_UNAVAILABLE");
        continue;
      }
      scheduled.set(id, { start, end });
      advanceAssignee(task.assigneeId, end);
      continue;
    }

    const assigneeId = task.assigneeId!;
    const cal = calendarOf(assigneeId);
    if (!cal) {
      errors.set(id, "NO_ASSIGNEE");
      continue;
    }

    // 着手中タスク: 開始は固定し、残工数をアンカー日以降から消化して終了だけ再計算
    if (mode === "PARTIAL") {
      const start = task.fixedStart
        ? startOfDay(task.fixedStart)
        : startOfDay(anchor);
      const remaining = task.remainingHours ?? task.manHours ?? 0;

      const lastEnd = assigneeLastEnd.get(assigneeId);
      const resourceStart = lastEnd ? nextWorkingDay(cal, lastEnd) : null;
      const workFrom = maxDate(anchor, resourceStart);
      const ws = firstWorkingDayOnOrAfter(cal, workFrom);

      let end: Date | null;
      if (remaining <= 0) {
        // 残ゼロ: アンカー日（最初の稼働日）に完了とみなす
        end = ws ?? startOfDay(anchor);
      } else if (!ws) {
        errors.set(id, "CALENDAR_UNAVAILABLE");
        continue;
      } else {
        end = consumeHours(cal, ws, remaining);
      }
      if (!end) {
        errors.set(id, "CALENDAR_UNAVAILABLE");
        continue;
      }
      // 終了は開始以降である保証
      if (end.getTime() < start.getTime()) end = start;

      scheduled.set(id, { start, end });
      advanceAssignee(assigneeId, end);
      continue;
    }

    // SCHEDULE（既定）: 依存・資源・アンカーの max から前詰め
    const manHours = task.manHours!;

    let depEarliest: Date | null = null;
    for (const e of predEdges.get(id)!) {
      const pr = scheduled.get(e.predId);
      if (!pr) continue;
      const es = dependencyEarliestStart(
        cal,
        e.type,
        e.lag,
        pr.start,
        pr.end,
        manHours,
        standardWorkingHours,
      );
      depEarliest = maxDate(depEarliest ?? anchor, es);
    }

    const lastEnd = assigneeLastEnd.get(assigneeId);
    const resourceStart = lastEnd ? nextWorkingDay(cal, lastEnd) : null;

    let rawStart = anchor;
    rawStart = maxDate(rawStart, depEarliest);
    rawStart = maxDate(rawStart, resourceStart);

    const start = firstWorkingDayOnOrAfter(cal, rawStart);
    if (!start) {
      errors.set(id, "CALENDAR_UNAVAILABLE");
      continue;
    }
    const end = consumeHours(cal, start, manHours);
    if (!end) {
      errors.set(id, "CALENDAR_UNAVAILABLE");
      continue;
    }

    scheduled.set(id, { start, end });
    advanceAssignee(assigneeId, end);
  }

  return { scheduled, errors, cycleTaskIds };
}
