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
