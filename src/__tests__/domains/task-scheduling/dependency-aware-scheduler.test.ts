import {
  schedule,
  ScheduleInput,
  SchedulableTask,
  DependencyEdge,
  WorkingCalendar,
} from "@/domains/task-scheduling/dependency-aware-scheduler";

// ローカルタイムの暦日を作るヘルパ（month は 1 始まり）
const d = (y: number, m: number, day: number) => new Date(y, m - 1, day);
// 比較用に YYYY-MM-DD へ整形
const fmt = (date?: Date) =>
  date
    ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
        2,
        "0",
      )}-${String(date.getDate()).padStart(2, "0")}`
    : undefined;

const isWeekend = (date: Date) => date.getDay() === 0 || date.getDay() === 6;
// 平日8h・土日0hのカレンダー
const cal8: WorkingCalendar = {
  getAvailableHours: (date) => (isWeekend(date) ? 0 : 8),
};
// 常に稼働不可（rate=0相当）
const calZero: WorkingCalendar = { getAvailableHours: () => 0 };

const baseInput = (
  tasks: SchedulableTask[],
  dependencies: DependencyEdge[],
  anchorDate: Date,
  calendarOf: ScheduleInput["calendarOf"] = () => cal8,
  standardWorkingHours = 8,
): ScheduleInput => ({
  tasks,
  dependencies,
  anchorDate,
  calendarOf,
  standardWorkingHours,
});

// 2024-01-01(月) 起点。1/6(土),1/7(日)が週末。祝日はカレンダーに含めない。
const MON_JAN1 = d(2024, 1, 1);

describe("dependency-aware-scheduler", () => {
  test("FS lag0: 先行終了の翌稼働日に後続が開始する", () => {
    const tasks: SchedulableTask[] = [
      { taskId: 1, taskNo: "A-001", assigneeId: 1, manHours: 8 },
      { taskId: 2, taskNo: "A-002", assigneeId: 2, manHours: 8 },
    ];
    const deps: DependencyEdge[] = [
      { predId: 1, succId: 2, type: "FS", lag: 0 },
    ];
    const out = schedule(baseInput(tasks, deps, MON_JAN1));

    expect(fmt(out.scheduled.get(1)?.start)).toBe("2024-01-01");
    expect(fmt(out.scheduled.get(1)?.end)).toBe("2024-01-01");
    expect(fmt(out.scheduled.get(2)?.start)).toBe("2024-01-02");
    expect(fmt(out.scheduled.get(2)?.end)).toBe("2024-01-02");
  });

  test("FS lag2: 翌稼働日からさらに2営業日あけて開始する", () => {
    const tasks: SchedulableTask[] = [
      { taskId: 1, taskNo: "A-001", assigneeId: 1, manHours: 8 },
      { taskId: 2, taskNo: "A-002", assigneeId: 2, manHours: 8 },
    ];
    const deps: DependencyEdge[] = [
      { predId: 1, succId: 2, type: "FS", lag: 2 },
    ];
    const out = schedule(baseInput(tasks, deps, MON_JAN1));

    // 先行終了1/1 → 翌稼働日1/2 → +2営業日 = 1/4
    expect(fmt(out.scheduled.get(2)?.start)).toBe("2024-01-04");
  });

  test("SS lag0: 先行開始と同日に後続が開始できる", () => {
    const tasks: SchedulableTask[] = [
      { taskId: 1, taskNo: "A-001", assigneeId: 1, manHours: 8 },
      { taskId: 2, taskNo: "A-002", assigneeId: 2, manHours: 8 },
    ];
    const deps: DependencyEdge[] = [
      { predId: 1, succId: 2, type: "SS", lag: 0 },
    ];
    const out = schedule(baseInput(tasks, deps, MON_JAN1));

    expect(fmt(out.scheduled.get(1)?.start)).toBe("2024-01-01");
    expect(fmt(out.scheduled.get(2)?.start)).toBe("2024-01-01");
  });

  test("資源制約: 同一担当者のタスクは前詰めで逐次に並ぶ", () => {
    const tasks: SchedulableTask[] = [
      { taskId: 1, taskNo: "A-001", assigneeId: 1, manHours: 8 },
      { taskId: 2, taskNo: "A-002", assigneeId: 1, manHours: 8 },
    ];
    const out = schedule(baseInput(tasks, [], MON_JAN1));

    expect(fmt(out.scheduled.get(1)?.start)).toBe("2024-01-01");
    expect(fmt(out.scheduled.get(2)?.start)).toBe("2024-01-02");
  });

  test("資源 × 依存の max: 資源制約が依存制約より後ろなら資源が勝つ", () => {
    const tasks: SchedulableTask[] = [
      // assignee2 の先行作業（2日かかる）
      { taskId: 10, taskNo: "P-001", assigneeId: 2, manHours: 16 },
      // assignee1 の作業（B の先行）
      { taskId: 20, taskNo: "P-002", assigneeId: 1, manHours: 8 },
      // assignee2 の B（A=20 に FS 依存）
      { taskId: 30, taskNo: "P-003", assigneeId: 2, manHours: 8 },
    ];
    const deps: DependencyEdge[] = [
      { predId: 20, succId: 30, type: "FS", lag: 0 },
    ];
    const out = schedule(baseInput(tasks, deps, MON_JAN1));

    // P-001: 1/1-1/2、P-002: 1/1。B(30) の依存最早=1/2、資源最早=P-001終了(1/2)の翌日=1/3 → 1/3
    expect(fmt(out.scheduled.get(10)?.end)).toBe("2024-01-02");
    expect(fmt(out.scheduled.get(20)?.start)).toBe("2024-01-01");
    expect(fmt(out.scheduled.get(30)?.start)).toBe("2024-01-03");
  });

  test("FF lag0: 後続終了が先行終了以上になる（近似）", () => {
    const tasks: SchedulableTask[] = [
      { taskId: 1, taskNo: "A-001", assigneeId: 1, manHours: 8 },
      { taskId: 2, taskNo: "A-002", assigneeId: 2, manHours: 16 },
    ];
    const deps: DependencyEdge[] = [
      { predId: 1, succId: 2, type: "FF", lag: 0 },
    ];
    const out = schedule(baseInput(tasks, deps, MON_JAN1));

    const a = out.scheduled.get(1)!;
    const b = out.scheduled.get(2)!;
    expect(b.end.getTime()).toBeGreaterThanOrEqual(a.end.getTime());
  });

  test("週末・休日をまたいで終了日が伸びる", () => {
    const tasks: SchedulableTask[] = [
      { taskId: 1, taskNo: "A-001", assigneeId: 1, manHours: 24 },
    ];
    // 1/5(金)起点、24h = 3稼働日 → 1/5,1/8,1/9（1/6,1/7は週末）
    const out = schedule(baseInput(tasks, [], d(2024, 1, 5)));
    expect(fmt(out.scheduled.get(1)?.start)).toBe("2024-01-05");
    expect(fmt(out.scheduled.get(1)?.end)).toBe("2024-01-09");
  });

  test("アンカー日が週末なら最初の稼働日に開始する", () => {
    const tasks: SchedulableTask[] = [
      { taskId: 1, taskNo: "A-001", assigneeId: 1, manHours: 8 },
    ];
    // 1/6(土)起点 → 1/8(月)
    const out = schedule(baseInput(tasks, [], d(2024, 1, 6)));
    expect(fmt(out.scheduled.get(1)?.start)).toBe("2024-01-08");
  });

  test("サイクル検出: 循環したタスクはエラーにし、サイクル外は確定する", () => {
    const tasks: SchedulableTask[] = [
      { taskId: 1, taskNo: "A-001", assigneeId: 1, manHours: 8 },
      { taskId: 2, taskNo: "A-002", assigneeId: 1, manHours: 8 },
      { taskId: 3, taskNo: "A-003", assigneeId: 2, manHours: 8 }, // 独立
    ];
    const deps: DependencyEdge[] = [
      { predId: 1, succId: 2, type: "FS", lag: 0 },
      { predId: 2, succId: 1, type: "FS", lag: 0 },
    ];
    const out = schedule(baseInput(tasks, deps, MON_JAN1));

    expect(out.cycleTaskIds.has(1)).toBe(true);
    expect(out.cycleTaskIds.has(2)).toBe(true);
    expect(out.errors.get(1)).toBe("CYCLE");
    expect(out.errors.get(2)).toBe("CYCLE");
    expect(out.scheduled.has(1)).toBe(false);
    // 独立タスクは確定
    expect(fmt(out.scheduled.get(3)?.start)).toBe("2024-01-01");
  });

  test("担当者・工数未設定はエラーにし、その依存辺は無視される", () => {
    const tasks: SchedulableTask[] = [
      { taskId: 1, taskNo: "A-001", manHours: 8 }, // 担当者なし
      { taskId: 2, taskNo: "A-002", assigneeId: 1, manHours: 0 }, // 工数なし
      { taskId: 3, taskNo: "A-003", assigneeId: 1, manHours: 8 }, // 1 に FS 依存
    ];
    const deps: DependencyEdge[] = [
      { predId: 1, succId: 3, type: "FS", lag: 0 },
    ];
    const out = schedule(baseInput(tasks, deps, MON_JAN1));

    expect(out.errors.get(1)).toBe("NO_ASSIGNEE");
    expect(out.errors.get(2)).toBe("NO_MANHOURS");
    // 先行(1)が無効でも 3 はアンカー日から開始できる
    expect(fmt(out.scheduled.get(3)?.start)).toBe("2024-01-01");
  });

  test("稼働可能日が無い場合は CALENDAR_UNAVAILABLE", () => {
    const tasks: SchedulableTask[] = [
      { taskId: 1, taskNo: "A-001", assigneeId: 1, manHours: 8 },
    ];
    const out = schedule(baseInput(tasks, [], MON_JAN1, () => calZero));
    expect(out.errors.get(1)).toBe("CALENDAR_UNAVAILABLE");
    expect(out.scheduled.has(1)).toBe(false);
  });

  test("決定性: taskNo 自然順でタイブレークされる（配列順に依存しない）", () => {
    const tasks: SchedulableTask[] = [
      // 配列順は B が先だが taskNo は A-001 が先
      { taskId: 2, taskNo: "A-002", assigneeId: 1, manHours: 8 },
      { taskId: 1, taskNo: "A-001", assigneeId: 1, manHours: 8 },
    ];
    const out = schedule(baseInput(tasks, [], MON_JAN1));

    // A-001(taskId=1) が先に 1/1、A-002(taskId=2) が 1/2
    expect(fmt(out.scheduled.get(1)?.start)).toBe("2024-01-01");
    expect(fmt(out.scheduled.get(2)?.start)).toBe("2024-01-02");
  });
});
