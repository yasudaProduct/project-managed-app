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
  fixedDateTaskKeywords: [],
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

  describe("同日詰め込み", () => {
    test("同一担当者の小タスクは同じ日の残り稼働に詰め込まれる", () => {
      const result = forwardSchedule({
        tasks: [
          task({ taskId: 1, taskNo: "0001", yoteiKosu: 2 }),
          task({ taskId: 2, taskNo: "0002", yoteiKosu: 2 }),
          task({ taskId: 3, taskNo: "0003", yoteiKosu: 2 }),
        ],
        dependencies: [],
        calendars: new Map([[1, weekday8()]]),
        standardWorkingHours: 8,
        options: baseOptions(MON),
      });
      // 2h×3=6h < 8h/日 → 全て 06-15 に収まる
      for (const id of [1, 2, 3]) {
        const r = result.find((x) => x.taskId === id)!;
        expect(r.scheduledStartDate).toEqual(new Date(2026, 5, 15));
        expect(r.scheduledEndDate).toEqual(new Date(2026, 5, 15));
      }
    });

    test("前タスクが日中で終わる場合、次タスクは同日の残り稼働から開始", () => {
      const result = forwardSchedule({
        tasks: [
          task({ taskId: 1, taskNo: "0001", yoteiKosu: 12 }),
          task({ taskId: 2, taskNo: "0002", yoteiKosu: 8 }),
        ],
        dependencies: [],
        calendars: new Map([[1, weekday8()]]),
        standardWorkingHours: 8,
        options: baseOptions(MON),
      });
      const a = result.find((r) => r.taskId === 1)!;
      const b = result.find((r) => r.taskId === 2)!;
      // t1: 06-15(8h) + 06-16(4h) → end 06-16
      expect(a.scheduledEndDate).toEqual(new Date(2026, 5, 16));
      // t2: 06-16 の残り4h + 06-17 の4h → 06-16 開始、06-17 終了
      expect(b.scheduledStartDate).toEqual(new Date(2026, 5, 16));
      expect(b.scheduledEndDate).toEqual(new Date(2026, 5, 17));
    });

    test("稼働を使い切った日には詰め込まず翌営業日から", () => {
      const result = forwardSchedule({
        tasks: [
          task({ taskId: 1, taskNo: "0001", yoteiKosu: 8 }),
          task({ taskId: 2, taskNo: "0002", yoteiKosu: 2 }),
        ],
        dependencies: [],
        calendars: new Map([[1, weekday8()]]),
        standardWorkingHours: 8,
        options: baseOptions(MON),
      });
      expect(result.find((r) => r.taskId === 2)!.scheduledStartDate).toEqual(
        new Date(2026, 5, 16)
      );
    });

    test("FS依存は同日詰め込みより優先され翌日以降に開始", () => {
      const result = forwardSchedule({
        tasks: [
          task({ taskId: 1, taskNo: "0001", yoteiKosu: 2 }),
          task({ taskId: 2, taskNo: "0002", yoteiKosu: 2 }),
        ],
        dependencies: [dep(1, 2, "FS")],
        calendars: new Map([[1, weekday8()]]),
        standardWorkingHours: 8,
        options: baseOptions(MON),
      });
      // 06-15 に6h残っていても FS 制約で翌営業日から
      expect(result.find((r) => r.taskId === 2)!.scheduledStartDate).toEqual(
        new Date(2026, 5, 16)
      );
    });

    test("定常タスクの消費と通常タスクの消費が同じ日で合成される", () => {
      const result = forwardSchedule({
        tasks: [
          task({
            taskId: 1,
            taskNo: "0001",
            taskName: "プロジェクト管理",
            yoteiStartDate: new Date(2026, 5, 15),
            yoteiEndDate: new Date(2026, 5, 19),
            yoteiKosu: 20, // 5稼働日 → 4h/日
          }),
          task({ taskId: 2, taskNo: "0002", taskName: "実装A", yoteiKosu: 2 }),
          task({ taskId: 3, taskNo: "0003", taskName: "実装B", yoteiKosu: 2 }),
        ],
        dependencies: [],
        calendars: new Map([[1, weekday8()]]),
        standardWorkingHours: 8,
        options: baseOptions(MON, {
          steadyTaskKeywords: ["管理"],
          consumeSteadyTaskCapacity: true,
        }),
      });
      // 06-15 実効4h → 2h+2h の両タスクが同日に収まる
      expect(result.find((r) => r.taskId === 2)!.scheduledEndDate).toEqual(
        new Date(2026, 5, 15)
      );
      expect(result.find((r) => r.taskId === 3)!.scheduledStartDate).toEqual(
        new Date(2026, 5, 15)
      );
      expect(result.find((r) => r.taskId === 3)!.scheduledEndDate).toEqual(
        new Date(2026, 5, 15)
      );
    });
  });

  describe("実施日固定タスク", () => {
    // 06-25 は木曜（06-15 月曜起点）
    const DEPLOY = new Date(2026, 5, 25);

    test("キーワード一致タスクは前詰めせずYOTEI期間で固定する", () => {
      const result = forwardSchedule({
        tasks: [
          task({ taskId: 1, taskNo: "0001", assigneeId: 1, yoteiKosu: 8 }),
          task({
            taskId: 2,
            taskNo: "0002",
            taskName: "本番導入",
            assigneeId: 2,
            yoteiStartDate: DEPLOY,
            yoteiEndDate: DEPLOY,
            yoteiKosu: 8,
          }),
        ],
        dependencies: [dep(1, 2, "FS")],
        calendars: new Map([
          [1, weekday8()],
          [2, weekday8()],
        ]),
        standardWorkingHours: 8,
        options: baseOptions(MON, { fixedDateTaskKeywords: ["本番導入"] }),
      });
      const deploy = result.find((r) => r.taskId === 2)!;
      expect(deploy.note).toBe("FIXED_DATE");
      expect(deploy.isSteady).toBe(false);
      expect(deploy.fixed).toBe(false);
      expect(deploy.scheduledStartDate).toEqual(DEPLOY);
      expect(deploy.scheduledEndDate).toEqual(DEPLOY);
    });

    test("固定キーワードが無ければ通常どおり前詰めされる（対比）", () => {
      const result = forwardSchedule({
        tasks: [
          task({ taskId: 1, taskNo: "0001", assigneeId: 1, yoteiKosu: 8 }),
          task({
            taskId: 2,
            taskNo: "0002",
            taskName: "本番導入",
            assigneeId: 2,
            yoteiStartDate: DEPLOY,
            yoteiEndDate: DEPLOY,
            yoteiKosu: 8,
          }),
        ],
        dependencies: [dep(1, 2, "FS")],
        calendars: new Map([
          [1, weekday8()],
          [2, weekday8()],
        ]),
        standardWorkingHours: 8,
        options: baseOptions(MON),
      });
      // 固定しない場合は先行(06-15終了)の翌営業日 06-16 に前詰め
      expect(result.find((r) => r.taskId === 2)!.scheduledStartDate).toEqual(
        new Date(2026, 5, 16)
      );
    });

    test("固定タスクの後続は固定終了日の翌営業日から前詰めされる", () => {
      const result = forwardSchedule({
        tasks: [
          task({ taskId: 1, taskNo: "0001", assigneeId: 1, yoteiKosu: 8 }),
          task({
            taskId: 2,
            taskNo: "0002",
            taskName: "本番導入",
            assigneeId: 2,
            yoteiStartDate: DEPLOY,
            yoteiEndDate: DEPLOY,
            yoteiKosu: 8,
          }),
          task({ taskId: 3, taskNo: "0003", assigneeId: 3, yoteiKosu: 8 }),
        ],
        dependencies: [dep(1, 2, "FS"), dep(2, 3, "FS")],
        calendars: new Map([
          [1, weekday8()],
          [2, weekday8()],
          [3, weekday8()],
        ]),
        standardWorkingHours: 8,
        options: baseOptions(MON, { fixedDateTaskKeywords: ["本番導入"] }),
      });
      // 固定 06-25(木) の翌営業日 06-26(金)
      expect(result.find((r) => r.taskId === 3)!.scheduledStartDate).toEqual(
        new Date(2026, 5, 26)
      );
    });

    test("固定タスクは担当者の稼働を消費し同一担当者の通常タスクを後ろ倒しする", () => {
      const result = forwardSchedule({
        tasks: [
          task({
            taskId: 1,
            taskNo: "0001",
            taskName: "本番導入",
            assigneeId: 1,
            yoteiStartDate: MON, // 06-15
            yoteiEndDate: MON,
            yoteiKosu: 8, // 06-15 を丸一日消費
          }),
          task({ taskId: 2, taskNo: "0002", assigneeId: 1, yoteiKosu: 8 }),
        ],
        dependencies: [],
        calendars: new Map([[1, weekday8()]]),
        standardWorkingHours: 8,
        options: baseOptions(MON, { fixedDateTaskKeywords: ["本番導入"] }),
      });
      // 06-15 は固定タスクで満杯 → 通常タスクは翌営業日 06-16 から
      expect(result.find((r) => r.taskId === 2)!.scheduledStartDate).toEqual(
        new Date(2026, 5, 16)
      );
    });

    test("固定タスクの部分消費: 同日の残り稼働に通常タスクが詰め込まれる", () => {
      const result = forwardSchedule({
        tasks: [
          task({
            taskId: 1,
            taskNo: "0001",
            taskName: "本番導入",
            assigneeId: 1,
            yoteiStartDate: MON,
            yoteiEndDate: MON,
            yoteiKosu: 4, // 06-15 に4hだけ消費
          }),
          task({ taskId: 2, taskNo: "0002", assigneeId: 1, yoteiKosu: 8 }),
        ],
        dependencies: [],
        calendars: new Map([[1, weekday8()]]),
        standardWorkingHours: 8,
        options: baseOptions(MON, { fixedDateTaskKeywords: ["本番導入"] }),
      });
      const t2 = result.find((r) => r.taskId === 2)!;
      // 06-15 の残り4h + 06-16 の4h → 06-15開始・06-16終了
      expect(t2.scheduledStartDate).toEqual(new Date(2026, 5, 15));
      expect(t2.scheduledEndDate).toEqual(new Date(2026, 5, 16));
    });

    test("別担当者の固定タスクは当該通常タスクの稼働に影響しない", () => {
      const result = forwardSchedule({
        tasks: [
          task({
            taskId: 1,
            taskNo: "0001",
            taskName: "本番導入",
            assigneeId: 2,
            yoteiStartDate: MON,
            yoteiEndDate: MON,
            yoteiKosu: 8,
          }),
          task({ taskId: 2, taskNo: "0002", assigneeId: 1, yoteiKosu: 8 }),
        ],
        dependencies: [],
        calendars: new Map([
          [1, weekday8()],
          [2, weekday8()],
        ]),
        standardWorkingHours: 8,
        options: baseOptions(MON, { fixedDateTaskKeywords: ["本番導入"] }),
      });
      // 担当者1は固定タスク(担当者2)の消費を受けず 06-15 から
      expect(result.find((r) => r.taskId === 2)!.scheduledStartDate).toEqual(
        new Date(2026, 5, 15)
      );
    });

    test("期間未設定の固定タスクはskip(FIXED_NO_PERIOD)", () => {
      const result = forwardSchedule({
        tasks: [
          task({
            taskId: 1,
            taskNo: "0001",
            taskName: "本番導入",
            yoteiStartDate: undefined,
            yoteiEndDate: undefined,
          }),
        ],
        dependencies: [],
        calendars: new Map([[1, weekday8()]]),
        standardWorkingHours: 8,
        options: baseOptions(MON, { fixedDateTaskKeywords: ["本番導入"] }),
      });
      expect(result[0].skipped).toBe(true);
      expect(result[0].note).toBe("FIXED_NO_PERIOD");
    });

    test("予定工数0の固定タスクもマイルストーンとして固定配置する", () => {
      const result = forwardSchedule({
        tasks: [
          task({
            taskId: 1,
            taskNo: "0001",
            taskName: "本番導入",
            yoteiKosu: 0,
            yoteiStartDate: DEPLOY,
            yoteiEndDate: DEPLOY,
          }),
        ],
        dependencies: [],
        calendars: new Map([[1, weekday8()]]),
        standardWorkingHours: 8,
        options: baseOptions(MON, { fixedDateTaskKeywords: ["本番導入"] }),
      });
      expect(result[0].skipped).toBe(false);
      expect(result[0].note).toBe("FIXED_DATE");
      expect(result[0].scheduledStartDate).toEqual(DEPLOY);
      expect(result[0].scheduledManHours).toBe(0);
    });

    test("先行タスクが固定日を超える場合はFIXED_DATE_CONFLICT", () => {
      const result = forwardSchedule({
        tasks: [
          // 80h → 06-15..06-26(金) まで掛かり、固定日 06-25 を超える
          task({ taskId: 1, taskNo: "0001", assigneeId: 1, yoteiKosu: 80 }),
          task({
            taskId: 2,
            taskNo: "0002",
            taskName: "本番導入",
            assigneeId: 2,
            yoteiStartDate: DEPLOY,
            yoteiEndDate: DEPLOY,
            yoteiKosu: 8,
          }),
        ],
        dependencies: [dep(1, 2, "FS")],
        calendars: new Map([
          [1, weekday8()],
          [2, weekday8()],
        ]),
        standardWorkingHours: 8,
        options: baseOptions(MON, { fixedDateTaskKeywords: ["本番導入"] }),
      });
      const deploy = result.find((r) => r.taskId === 2)!;
      expect(deploy.note).toBe("FIXED_DATE_CONFLICT");
      // 競合していても日付は固定のまま
      expect(deploy.scheduledStartDate).toEqual(DEPLOY);
    });

    test("固定と定常の両方に一致する場合は固定を優先する", () => {
      const result = forwardSchedule({
        tasks: [
          task({
            taskId: 1,
            taskNo: "0001",
            taskName: "本番導入",
            yoteiStartDate: DEPLOY,
            yoteiEndDate: DEPLOY,
            yoteiKosu: 8,
          }),
        ],
        dependencies: [],
        calendars: new Map([[1, weekday8()]]),
        standardWorkingHours: 8,
        options: baseOptions(MON, {
          steadyTaskKeywords: ["導入"],
          fixedDateTaskKeywords: ["本番導入"],
        }),
      });
      expect(result[0].note).toBe("FIXED_DATE");
      expect(result[0].isSteady).toBe(false);
    });
  });

  describe("実施日固定タスクの終了日算出", () => {
    // 06-25 は木曜（06-15 月曜起点）
    const DEPLOY = new Date(2026, 5, 25);
    const fixedOpts = (over: Partial<SchedulingOptions> = {}) =>
      baseOptions(MON, { fixedDateTaskKeywords: ["本番導入"], ...over });
    const deployTask = (over: Partial<SchedulingTask> = {}) =>
      task({
        taskId: 99,
        taskNo: "0099",
        taskName: "本番導入",
        assigneeId: 9,
        yoteiStartDate: DEPLOY,
        yoteiEndDate: DEPLOY,
        yoteiKosu: 8,
        ...over,
      });
    const cals = (...entries: [number, WorkingCalendar][]) => new Map(entries);

    test("終了日は工数と稼働可能時間から算出される(入力期間内ならFIXED_DATE)", () => {
      const result = forwardSchedule({
        tasks: [
          // 開始 06-25(木)・入力終了 06-26(金)・工数10h → 8h+2h で算出終了日 06-26
          deployTask({
            yoteiEndDate: new Date(2026, 5, 26),
            yoteiKosu: 10,
          }),
        ],
        dependencies: [],
        calendars: cals([9, weekday8()]),
        standardWorkingHours: 8,
        options: fixedOpts(),
      });
      const deploy = result.find((r) => r.taskId === 99)!;
      expect(deploy.scheduledStartDate).toEqual(DEPLOY);
      expect(deploy.scheduledEndDate).toEqual(new Date(2026, 5, 26));
      expect(deploy.scheduledManHours).toBe(10);
      expect(deploy.note).toBe("FIXED_DATE");
    });

    test("算出終了日が入力終了日を超える場合はFIXED_PERIOD_EXCEEDED(日付は算出値のまま)", () => {
      const result = forwardSchedule({
        tasks: [
          // 開始=入力終了=06-25 だが工数10h → 算出終了日 06-26 が入力終了日を超過
          deployTask({ yoteiKosu: 10 }),
        ],
        dependencies: [],
        calendars: cals([9, weekday8()]),
        standardWorkingHours: 8,
        options: fixedOpts(),
      });
      const deploy = result.find((r) => r.taskId === 99)!;
      expect(deploy.scheduledStartDate).toEqual(DEPLOY);
      expect(deploy.scheduledEndDate).toEqual(new Date(2026, 5, 26));
      expect(deploy.note).toBe("FIXED_PERIOD_EXCEEDED");
      expect(deploy.skipped).toBe(false);
    });

    test("算出終了日が入力終了日より早い場合も算出値を採用し、後続はそこから前詰め", () => {
      const result = forwardSchedule({
        tasks: [
          // 入力 06-22(月)〜06-26(金) だが工数8h → 算出終了日 06-22
          deployTask({
            taskId: 1,
            taskNo: "0001",
            assigneeId: 1,
            yoteiStartDate: new Date(2026, 5, 22),
            yoteiEndDate: new Date(2026, 5, 26),
            yoteiKosu: 8,
          }),
          task({ taskId: 2, taskNo: "0002", assigneeId: 2, yoteiKosu: 8 }),
        ],
        dependencies: [dep(1, 2, "FS")],
        calendars: cals([1, weekday8()], [2, weekday8()]),
        standardWorkingHours: 8,
        options: fixedOpts(),
      });
      const fixed = result.find((r) => r.taskId === 1)!;
      expect(fixed.scheduledEndDate).toEqual(new Date(2026, 5, 22));
      expect(fixed.note).toBe("FIXED_DATE");
      // 後続は算出終了日 06-22 の翌営業日 06-23 から
      expect(result.find((r) => r.taskId === 2)!.scheduledStartDate).toEqual(
        new Date(2026, 5, 23)
      );
    });

    test("開始日が非稼働日でも開始日は入力のまま、工数消化は以降の稼働日で行う", () => {
      const result = forwardSchedule({
        tasks: [
          // 開始 06-20(土)・入力終了 06-22(月)・工数8h → 消化は 06-22(月)
          deployTask({
            yoteiStartDate: new Date(2026, 5, 20),
            yoteiEndDate: new Date(2026, 5, 22),
            yoteiKosu: 8,
          }),
        ],
        dependencies: [],
        calendars: cals([9, weekday8()]),
        standardWorkingHours: 8,
        options: fixedOpts(),
      });
      const deploy = result.find((r) => r.taskId === 99)!;
      expect(deploy.scheduledStartDate).toEqual(new Date(2026, 5, 20));
      expect(deploy.scheduledEndDate).toEqual(new Date(2026, 5, 22));
      expect(deploy.note).toBe("FIXED_DATE");
    });

    test("週末を跨いで終了日を算出する", () => {
      const result = forwardSchedule({
        tasks: [
          // 開始 06-19(金)・工数16h → 06-19 + 06-22(月) で終了 06-22
          deployTask({
            yoteiStartDate: new Date(2026, 5, 19),
            yoteiEndDate: new Date(2026, 5, 22),
            yoteiKosu: 16,
          }),
        ],
        dependencies: [],
        calendars: cals([9, weekday8()]),
        standardWorkingHours: 8,
        options: fixedOpts(),
      });
      const deploy = result.find((r) => r.taskId === 99)!;
      expect(deploy.scheduledEndDate).toEqual(new Date(2026, 5, 22));
      expect(deploy.note).toBe("FIXED_DATE");
    });

    test("工数は実消化で稼働を占有し、超過分も同一担当者の通常タスクを押し出す", () => {
      const result = forwardSchedule({
        tasks: [
          // 入力 06-15〜06-15 だが工数16h → 06-15,06-16 を占有(期間超過)
          deployTask({
            taskId: 1,
            taskNo: "0001",
            assigneeId: 1,
            yoteiStartDate: MON,
            yoteiEndDate: MON,
            yoteiKosu: 16,
          }),
          task({ taskId: 2, taskNo: "0002", assigneeId: 1, yoteiKosu: 8 }),
        ],
        dependencies: [],
        calendars: cals([1, weekday8()]),
        standardWorkingHours: 8,
        options: fixedOpts(),
      });
      const fixed = result.find((r) => r.taskId === 1)!;
      expect(fixed.scheduledEndDate).toEqual(new Date(2026, 5, 16));
      expect(fixed.note).toBe("FIXED_PERIOD_EXCEEDED");
      // 同一担当者の通常タスクは固定タスクの占有(06-15,06-16)を避けて 06-17 から
      expect(result.find((r) => r.taskId === 2)!.scheduledStartDate).toEqual(
        new Date(2026, 5, 17)
      );
    });

    test("稼働率(日次上限)を考慮して終了日を算出する", () => {
      const result = forwardSchedule({
        tasks: [
          // 稼働4h/日の担当者で工数8h → 06-22(月)開始・06-23(火)終了
          deployTask({
            yoteiStartDate: new Date(2026, 5, 22),
            yoteiEndDate: new Date(2026, 5, 23),
            yoteiKosu: 8,
          }),
        ],
        dependencies: [],
        calendars: cals([9, weekday8(4)]),
        standardWorkingHours: 8,
        options: fixedOpts(),
      });
      const deploy = result.find((r) => r.taskId === 99)!;
      expect(deploy.scheduledEndDate).toEqual(new Date(2026, 5, 23));
      expect(deploy.note).toBe("FIXED_DATE");
    });

    test("後続タスクは算出終了日の翌営業日から前詰めされる(週末スキップ)", () => {
      const result = forwardSchedule({
        tasks: [
          // 固定 06-25 開始・工数10h → 算出終了 06-26(金)。後続は 06-29(月) から
          deployTask({ taskId: 1, taskNo: "0001", assigneeId: 1, yoteiKosu: 10 }),
          task({ taskId: 2, taskNo: "0002", assigneeId: 2, yoteiKosu: 8 }),
        ],
        dependencies: [dep(1, 2, "FS")],
        calendars: cals([1, weekday8()], [2, weekday8()]),
        standardWorkingHours: 8,
        options: fixedOpts(),
      });
      expect(result.find((r) => r.taskId === 2)!.scheduledStartDate).toEqual(
        new Date(2026, 5, 29)
      );
    });

    test("固定タスクの先行タスクは基準日から前詰めされる(固定日直前へ引き寄せない)", () => {
      const result = forwardSchedule({
        tasks: [
          task({ taskId: 1, taskNo: "0001", assigneeId: 1, yoteiKosu: 8 }),
          deployTask(),
        ],
        dependencies: [dep(1, 99, "FS")],
        calendars: cals([1, weekday8()], [9, weekday8()]),
        standardWorkingHours: 8,
        options: fixedOpts(),
      });
      const pred = result.find((r) => r.taskId === 1)!;
      // 先行は基準日 06-15 に前詰めされ、固定日 06-25 までのギャップは許容
      expect(pred.scheduledStartDate).toEqual(new Date(2026, 5, 15));
      expect(pred.scheduledEndDate).toEqual(new Date(2026, 5, 15));
      expect(pred.note).toBe("NORMAL");
      const deploy = result.find((r) => r.taskId === 99)!;
      expect(deploy.scheduledStartDate).toEqual(DEPLOY);
      expect(deploy.note).toBe("FIXED_DATE");
    });

    test("工数0の固定タスクは入力期間をそのまま採用する", () => {
      const result = forwardSchedule({
        tasks: [
          deployTask({
            yoteiStartDate: new Date(2026, 5, 22),
            yoteiEndDate: new Date(2026, 5, 24),
            yoteiKosu: 0,
          }),
        ],
        dependencies: [],
        calendars: cals([9, weekday8()]),
        standardWorkingHours: 8,
        options: fixedOpts(),
      });
      const deploy = result.find((r) => r.taskId === 99)!;
      expect(deploy.scheduledStartDate).toEqual(new Date(2026, 5, 22));
      expect(deploy.scheduledEndDate).toEqual(new Date(2026, 5, 24));
      expect(deploy.scheduledManHours).toBe(0);
      expect(deploy.note).toBe("FIXED_DATE");
    });

    test("先行超過と期間超過が重なる場合はFIXED_DATE_CONFLICTを優先する", () => {
      const result = forwardSchedule({
        tasks: [
          // 80h → 06-15..06-26 まで掛かり固定開始日 06-25 に間に合わない
          task({ taskId: 1, taskNo: "0001", assigneeId: 1, yoteiKosu: 80 }),
          // 工数10h → 算出終了 06-26 が入力終了日 06-25 も超過
          deployTask({ yoteiKosu: 10 }),
        ],
        dependencies: [dep(1, 99, "FS")],
        calendars: cals([1, weekday8()], [9, weekday8()]),
        standardWorkingHours: 8,
        options: fixedOpts(),
      });
      const deploy = result.find((r) => r.taskId === 99)!;
      expect(deploy.note).toBe("FIXED_DATE_CONFLICT");
      // 日付は開始固定・終了算出のまま
      expect(deploy.scheduledStartDate).toEqual(DEPLOY);
      expect(deploy.scheduledEndDate).toEqual(new Date(2026, 5, 26));
    });
  });

  describe("外部負荷を考慮したカレンダー(ExternalLoadAwareCalendar連携)", () => {
    // 他WBS負荷はカレンダー側(ExternalLoadAwareCalendar)で吸収する設計のため、
    // ここではカレンダーが返す残量に従って前詰めされることのみ確認する。
    const withExternal = (
      base: WorkingCalendar,
      externalByDateKey: Record<string, number>
    ): WorkingCalendar => ({
      getAvailableHours: (d: Date) => {
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
        const remaining = base.getAvailableHours(d) - (externalByDateKey[key] ?? 0);
        return remaining > 0 ? remaining : 0;
      },
    });

    test("外部負荷で満杯の日は避けて翌営業日から開始する", () => {
      const result = forwardSchedule({
        tasks: [task({ taskId: 1, taskNo: "0001", yoteiKosu: 8 })],
        dependencies: [],
        calendars: new Map([[1, withExternal(weekday8(), { "2026-06-15": 8 })]]),
        standardWorkingHours: 8,
        options: baseOptions(MON),
      });
      expect(result[0].scheduledStartDate).toEqual(new Date(2026, 5, 16));
    });

    test("外部負荷が部分的なら同日の残り稼働から開始する", () => {
      const result = forwardSchedule({
        tasks: [task({ taskId: 1, taskNo: "0001", yoteiKosu: 8 })],
        dependencies: [],
        calendars: new Map([[1, withExternal(weekday8(), { "2026-06-15": 4 })]]),
        standardWorkingHours: 8,
        options: baseOptions(MON),
      });
      // 06-15 の残り4h + 06-16 の4h
      expect(result[0].scheduledStartDate).toEqual(new Date(2026, 5, 15));
      expect(result[0].scheduledEndDate).toEqual(new Date(2026, 5, 16));
    });

    test("実施日固定タスクの終了日算出も外部負荷を考慮する", () => {
      const result = forwardSchedule({
        tasks: [
          task({
            taskId: 1,
            taskNo: "0001",
            taskName: "本番導入",
            yoteiStartDate: MON,
            yoteiEndDate: MON,
            yoteiKosu: 8,
          }),
        ],
        dependencies: [],
        calendars: new Map([[1, withExternal(weekday8(), { "2026-06-15": 4 })]]),
        standardWorkingHours: 8,
        options: baseOptions(MON, { fixedDateTaskKeywords: ["本番導入"] }),
      });
      // 06-15 は残り4hのみ → 8h は 06-15(4h)+06-16(4h) で終了 06-16(期間超過)
      expect(result[0].scheduledEndDate).toEqual(new Date(2026, 5, 16));
      expect(result[0].note).toBe("FIXED_PERIOD_EXCEEDED");
    });
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
