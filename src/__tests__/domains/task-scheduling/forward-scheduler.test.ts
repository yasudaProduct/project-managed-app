import { forwardSchedule } from "@/domains/task-scheduling/forward-scheduler";
import type { WorkingCalendar } from "@/domains/task-scheduling/working-calendar-walker";
import type { SchedulingTask } from "@/domains/task-scheduling/scheduling-task";
import type { SchedulingOptions } from "@/domains/task-scheduling/scheduling-options";
import {
  TaskDependency,
  type DependencyType,
} from "@/domains/task-dependency/task-dependency";

// 平日8h、土日0h。2026-06-15 は月曜、06-20 は土曜。
const weekday8 = (hours = 8): WorkingCalendar => ({
  getAvailableHours: (d: Date) =>
    d.getDay() === 0 || d.getDay() === 6 ? 0 : hours,
});

const baseOptions = (
  baselineDate: Date,
  over: Partial<SchedulingOptions> = {}
): SchedulingOptions => ({
  baselineDate,
  consumeSteadyTaskCapacity: false,
  steadyTaskKeywords: [],
  steadyDailyHoursMode: "PRORATE",
  ...over,
});

const task = (over: Partial<SchedulingTask>): SchedulingTask => ({
  taskId: 0,
  taskNo: "0000",
  taskName: "task",
  status: "NOT_STARTED",
  assigneeId: 1,
  yoteiKosu: 8,
  ...over,
});

const dep = (
  pre: number,
  suc: number,
  type: DependencyType = "FS",
  lag = 0
) =>
  TaskDependency.create({
    predecessorTaskId: pre,
    successorTaskId: suc,
    wbsId: 1,
    type,
    lag,
  });

const MON = new Date(2026, 5, 15); // 月曜
const SAT = new Date(2026, 5, 20); // 土曜

describe("forwardSchedule", () => {
  test("依存なし・同一担当者は前のタスク終了の翌営業日から前詰め", () => {
    const result = forwardSchedule({
      tasks: [
        task({ taskId: 1, taskNo: "0001", yoteiKosu: 8 }),
        task({ taskId: 2, taskNo: "0002", yoteiKosu: 8 }),
      ],
      dependencies: [],
      calendars: new Map([[1, weekday8()]]),
      standardWorkingHours: 8,
      options: baseOptions(MON),
    });
    const a = result.find((r) => r.taskId === 1)!;
    const b = result.find((r) => r.taskId === 2)!;
    expect(a.scheduledStartDate).toEqual(new Date(2026, 5, 15));
    expect(a.scheduledEndDate).toEqual(new Date(2026, 5, 15));
    expect(b.scheduledStartDate).toEqual(new Date(2026, 5, 16));
  });

  test("FS依存: 後続は先行終了の翌営業日から(別担当者でも)", () => {
    const result = forwardSchedule({
      tasks: [
        task({ taskId: 1, taskNo: "0001", assigneeId: 1, yoteiKosu: 8 }),
        task({ taskId: 2, taskNo: "0002", assigneeId: 2, yoteiKosu: 8 }),
      ],
      dependencies: [dep(1, 2, "FS")],
      calendars: new Map([
        [1, weekday8()],
        [2, weekday8()],
      ]),
      standardWorkingHours: 8,
      options: baseOptions(MON),
    });
    expect(result.find((r) => r.taskId === 2)!.scheduledStartDate).toEqual(
      new Date(2026, 5, 16)
    );
  });

  test("FS依存 + lag: lag日(カレンダー日)分後ろ倒し", () => {
    const result = forwardSchedule({
      tasks: [
        task({ taskId: 1, taskNo: "0001", assigneeId: 1, yoteiKosu: 8 }),
        task({ taskId: 2, taskNo: "0002", assigneeId: 2, yoteiKosu: 8 }),
      ],
      dependencies: [dep(1, 2, "FS", 2)],
      calendars: new Map([
        [1, weekday8()],
        [2, weekday8()],
      ]),
      standardWorkingHours: 8,
      options: baseOptions(MON),
    });
    // t1 end=06-15(月)、FS+lag2 → 06-15 +1 +2 = 06-18(木)
    expect(result.find((r) => r.taskId === 2)!.scheduledStartDate).toEqual(
      new Date(2026, 5, 18)
    );
  });

  test("SS依存: 後続は先行開始と同じ日から(別担当者)", () => {
    const result = forwardSchedule({
      tasks: [
        task({ taskId: 1, taskNo: "0001", assigneeId: 1, yoteiKosu: 16 }),
        task({ taskId: 2, taskNo: "0002", assigneeId: 2, yoteiKosu: 8 }),
      ],
      dependencies: [dep(1, 2, "SS")],
      calendars: new Map([
        [1, weekday8()],
        [2, weekday8()],
      ]),
      standardWorkingHours: 8,
      options: baseOptions(MON),
    });
    expect(result.find((r) => r.taskId === 2)!.scheduledStartDate).toEqual(
      new Date(2026, 5, 15)
    );
  });

  test("担当者並列: 別担当者は基準日から同時並行", () => {
    const result = forwardSchedule({
      tasks: [
        task({ taskId: 1, taskNo: "0001", assigneeId: 1, yoteiKosu: 8 }),
        task({ taskId: 2, taskNo: "0002", assigneeId: 2, yoteiKosu: 8 }),
      ],
      dependencies: [],
      calendars: new Map([
        [1, weekday8()],
        [2, weekday8()],
      ]),
      standardWorkingHours: 8,
      options: baseOptions(MON),
    });
    expect(result.find((r) => r.taskId === 1)!.scheduledStartDate).toEqual(
      new Date(2026, 5, 15)
    );
    expect(result.find((r) => r.taskId === 2)!.scheduledStartDate).toEqual(
      new Date(2026, 5, 15)
    );
  });

  test("基準日が非稼働日(土)なら翌営業日(月)から", () => {
    const result = forwardSchedule({
      tasks: [task({ taskId: 1, taskNo: "0001", yoteiKosu: 8 })],
      dependencies: [],
      calendars: new Map([[1, weekday8()]]),
      standardWorkingHours: 8,
      options: baseOptions(SAT),
    });
    expect(result[0].scheduledStartDate).toEqual(new Date(2026, 5, 22));
  });

  test("完了タスクは実績日程で固定し前詰めしない", () => {
    const result = forwardSchedule({
      tasks: [
        task({
          taskId: 1,
          taskNo: "0001",
          status: "COMPLETED",
          jissekiStartDate: new Date(2026, 5, 10),
          jissekiEndDate: new Date(2026, 5, 12),
          jissekiKosu: 16,
          yoteiKosu: 16,
        }),
      ],
      dependencies: [],
      calendars: new Map([[1, weekday8()]]),
      standardWorkingHours: 8,
      options: baseOptions(MON),
    });
    const r = result[0];
    expect(r.fixed).toBe(true);
    expect(r.note).toBe("COMPLETED_FIXED");
    expect(r.scheduledStartDate).toEqual(new Date(2026, 5, 10));
    expect(r.scheduledEndDate).toEqual(new Date(2026, 5, 12));
  });

  test("進行中タスクは残工数(予定-実績)を基準日以降に前詰め", () => {
    const result = forwardSchedule({
      tasks: [
        task({
          taskId: 1,
          taskNo: "0001",
          status: "IN_PROGRESS",
          yoteiKosu: 16,
          jissekiKosu: 8,
        }),
      ],
      dependencies: [],
      calendars: new Map([[1, weekday8()]]),
      standardWorkingHours: 8,
      options: baseOptions(MON),
    });
    const r = result[0];
    expect(r.note).toBe("IN_PROGRESS_REMAINING");
    expect(r.scheduledManHours).toBe(8);
    expect(r.scheduledStartDate).toEqual(new Date(2026, 5, 15));
    expect(r.scheduledEndDate).toEqual(new Date(2026, 5, 15));
  });

  test("担当者未設定タスクはskip(NO_ASSIGNEE)", () => {
    const result = forwardSchedule({
      tasks: [task({ taskId: 1, taskNo: "0001", assigneeId: undefined })],
      dependencies: [],
      calendars: new Map(),
      standardWorkingHours: 8,
      options: baseOptions(MON),
    });
    expect(result[0].skipped).toBe(true);
    expect(result[0].note).toBe("NO_ASSIGNEE");
  });

  test("予定工数未設定タスクはskip(NO_YOTEI_KOSU)", () => {
    const result = forwardSchedule({
      tasks: [task({ taskId: 1, taskNo: "0001", yoteiKosu: undefined })],
      dependencies: [],
      calendars: new Map([[1, weekday8()]]),
      standardWorkingHours: 8,
      options: baseOptions(MON),
    });
    expect(result[0].skipped).toBe(true);
    expect(result[0].note).toBe("NO_YOTEI_KOSU");
  });

  test("定常タスクは前詰めせずYOTEI期間をそのまま使う", () => {
    const result = forwardSchedule({
      tasks: [
        task({
          taskId: 1,
          taskNo: "0001",
          taskName: "プロジェクト管理",
          yoteiStartDate: new Date(2026, 5, 15),
          yoteiEndDate: new Date(2026, 5, 19),
          yoteiKosu: 20,
        }),
      ],
      dependencies: [],
      calendars: new Map([[1, weekday8()]]),
      standardWorkingHours: 8,
      options: baseOptions(MON, { steadyTaskKeywords: ["管理"] }),
    });
    const r = result[0];
    expect(r.isSteady).toBe(true);
    expect(r.note).toBe("STEADY_FIXED_PERIOD");
    expect(r.scheduledStartDate).toEqual(new Date(2026, 5, 15));
    expect(r.scheduledEndDate).toEqual(new Date(2026, 5, 19));
  });

  test("定常タスク稼働消費ON: 同一担当者の通常タスクの稼働が減り後ろ倒し", () => {
    const tasks = [
      task({
        taskId: 1,
        taskNo: "0001",
        taskName: "プロジェクト管理",
        assigneeId: 1,
        yoteiStartDate: new Date(2026, 5, 15),
        yoteiEndDate: new Date(2026, 5, 19),
        yoteiKosu: 20, // 5稼働日 → 4h/日按分
      }),
      task({
        taskId: 2,
        taskNo: "0002",
        taskName: "実装",
        assigneeId: 1,
        yoteiKosu: 8,
      }),
    ];
    const on = forwardSchedule({
      tasks,
      dependencies: [],
      calendars: new Map([[1, weekday8()]]),
      standardWorkingHours: 8,
      options: baseOptions(MON, {
        steadyTaskKeywords: ["管理"],
        consumeSteadyTaskCapacity: true,
      }),
    });
    // t2: 各日 8-4=4h → 8h で2日 → 06-15,06-16
    expect(on.find((r) => r.taskId === 2)!.scheduledEndDate).toEqual(
      new Date(2026, 5, 16)
    );

    const off = forwardSchedule({
      tasks,
      dependencies: [],
      calendars: new Map([[1, weekday8()]]),
      standardWorkingHours: 8,
      options: baseOptions(MON, {
        steadyTaskKeywords: ["管理"],
        consumeSteadyTaskCapacity: false,
      }),
    });
    // t2: 8h/日 → 1日 → 06-15
    expect(off.find((r) => r.taskId === 2)!.scheduledEndDate).toEqual(
      new Date(2026, 5, 15)
    );
  });

  test("定常タスクで期間未設定はskip(STEADY_NO_PERIOD)", () => {
    const result = forwardSchedule({
      tasks: [
        task({
          taskId: 1,
          taskNo: "0001",
          taskName: "進捗管理",
          yoteiStartDate: undefined,
          yoteiEndDate: undefined,
        }),
      ],
      dependencies: [],
      calendars: new Map([[1, weekday8()]]),
      standardWorkingHours: 8,
      options: baseOptions(MON, { steadyTaskKeywords: ["管理"] }),
    });
    expect(result[0].skipped).toBe(true);
    expect(result[0].note).toBe("STEADY_NO_PERIOD");
  });

  test("全日稼働0なら SCHEDULE_OVERFLOW で打ち切る", () => {
    const noWork: WorkingCalendar = { getAvailableHours: () => 0 };
    const result = forwardSchedule({
      tasks: [task({ taskId: 1, taskNo: "0001", yoteiKosu: 8 })],
      dependencies: [],
      calendars: new Map([[1, noWork]]),
      standardWorkingHours: 8,
      options: baseOptions(MON),
    });
    expect(result[0].note).toBe("SCHEDULE_OVERFLOW");
  });

  test("循環依存に含まれるタスクはskip(CYCLIC)し他は計算続行", () => {
    const result = forwardSchedule({
      tasks: [
        task({ taskId: 1, taskNo: "0001", assigneeId: 1, yoteiKosu: 8 }),
        task({ taskId: 2, taskNo: "0002", assigneeId: 1, yoteiKosu: 8 }),
        task({ taskId: 3, taskNo: "0003", assigneeId: 2, yoteiKosu: 8 }),
      ],
      dependencies: [dep(1, 2), dep(2, 1)], // 1-2が循環、3は独立
      calendars: new Map([
        [1, weekday8()],
        [2, weekday8()],
      ]),
      standardWorkingHours: 8,
      options: baseOptions(MON),
    });
    expect(result.find((r) => r.taskId === 1)!.note).toBe("CYCLIC");
    expect(result.find((r) => r.taskId === 2)!.note).toBe("CYCLIC");
    expect(result.find((r) => r.taskId === 3)!.scheduledStartDate).toEqual(
      new Date(2026, 5, 15)
    );
  });
});
