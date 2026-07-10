import { SchedulingPreconditionService } from "@/domains/task-scheduling/scheduling-precondition-service";
import type { SchedulingTask } from "@/domains/task-scheduling/scheduling-task";
import type { ScheduledTask } from "@/domains/task-scheduling/scheduled-result";
import { TaskDependency } from "@/domains/task-dependency/task-dependency";

const task = (over: Partial<SchedulingTask>): SchedulingTask => ({
  taskId: 0,
  taskNo: "0000",
  taskName: "task",
  status: "NOT_STARTED",
  assigneeId: 1,
  yoteiKosu: 8,
  ...over,
});

const dep = (pre: number, suc: number) =>
  TaskDependency.create({ predecessorTaskId: pre, successorTaskId: suc, wbsId: 1 });

describe("SchedulingPreconditionService.check", () => {
  test("問題なければ空配列", () => {
    const w = SchedulingPreconditionService.check(
      [task({ taskId: 1, taskNo: "0001" })],
      [],
      []
    );
    expect(w).toEqual([]);
  });

  test("担当者未設定を検出", () => {
    const w = SchedulingPreconditionService.check(
      [task({ taskId: 1, taskNo: "0001", assigneeId: undefined })],
      [],
      []
    );
    expect(w).toEqual([
      expect.objectContaining({ kind: "NO_ASSIGNEE", taskNo: "0001" }),
    ]);
  });

  test("予定工数未設定を検出(非定常)", () => {
    const w = SchedulingPreconditionService.check(
      [task({ taskId: 1, taskNo: "0001", yoteiKosu: 0 })],
      [],
      []
    );
    expect(w).toEqual([
      expect.objectContaining({ kind: "NO_YOTEI_KOSU", taskNo: "0001" }),
    ]);
  });

  test("定常タスクの期間未設定を検出", () => {
    const w = SchedulingPreconditionService.check(
      [
        task({
          taskId: 1,
          taskNo: "0001",
          taskName: "進捗管理",
          yoteiStartDate: undefined,
          yoteiEndDate: undefined,
        }),
      ],
      [],
      ["管理"]
    );
    expect(w).toEqual([
      expect.objectContaining({ kind: "STEADY_NO_PERIOD", taskNo: "0001" }),
    ]);
  });

  test("定常タスクは予定工数未設定でもNO_YOTEI_KOSUにしない", () => {
    const w = SchedulingPreconditionService.check(
      [
        task({
          taskId: 1,
          taskNo: "0001",
          taskName: "進捗管理",
          yoteiKosu: 0,
          yoteiStartDate: new Date(2026, 5, 15),
          yoteiEndDate: new Date(2026, 5, 19),
        }),
      ],
      [],
      ["管理"]
    );
    expect(w).toEqual([]);
  });

  test("実施日固定タスクの期間未設定を検出(FIXED_NO_PERIOD)", () => {
    const w = SchedulingPreconditionService.check(
      [
        task({
          taskId: 1,
          taskNo: "0001",
          taskName: "本番導入",
          yoteiStartDate: undefined,
          yoteiEndDate: undefined,
        }),
      ],
      [],
      [],
      ["本番導入"]
    );
    expect(w).toEqual([
      expect.objectContaining({ kind: "FIXED_NO_PERIOD", taskNo: "0001" }),
    ]);
  });

  test("実施日固定タスクは予定工数未設定でもNO_YOTEI_KOSUにしない", () => {
    const w = SchedulingPreconditionService.check(
      [
        task({
          taskId: 1,
          taskNo: "0001",
          taskName: "本番導入",
          yoteiKosu: 0,
          yoteiStartDate: new Date(2026, 5, 25),
          yoteiEndDate: new Date(2026, 5, 25),
        }),
      ],
      [],
      [],
      ["本番導入"]
    );
    expect(w).toEqual([]);
  });

  test("保留(ON_HOLD)タスクを検出（前詰め対象である旨の注意喚起）", () => {
    const w = SchedulingPreconditionService.check(
      [task({ taskId: 1, taskNo: "0001", status: "ON_HOLD" })],
      [],
      []
    );
    expect(w).toEqual([
      expect.objectContaining({ kind: "ON_HOLD", taskNo: "0001" }),
    ]);
  });

  test("日程のない完了タスクを検出（依存制約に反映されない）", () => {
    const w = SchedulingPreconditionService.check(
      [
        task({
          taskId: 1,
          taskNo: "0001",
          status: "COMPLETED",
          yoteiStartDate: undefined,
          yoteiEndDate: undefined,
          jissekiStartDate: undefined,
          jissekiEndDate: undefined,
        }),
      ],
      [],
      []
    );
    expect(
      w.some((x) => x.kind === "COMPLETED_NO_PERIOD" && x.taskNo === "0001")
    ).toBe(true);
  });

  test("実績日程のある完了タスクはCOMPLETED_NO_PERIODにしない", () => {
    const w = SchedulingPreconditionService.check(
      [
        task({
          taskId: 1,
          taskNo: "0001",
          status: "COMPLETED",
          jissekiStartDate: new Date(2026, 5, 10),
          jissekiEndDate: new Date(2026, 5, 11),
          jissekiKosu: 8,
        }),
      ],
      [],
      []
    );
    expect(w.some((x) => x.kind === "COMPLETED_NO_PERIOD")).toBe(false);
  });

  test("循環依存を検出しcycleTaskNosを返す", () => {
    const tasks = [
      task({ taskId: 1, taskNo: "0001" }),
      task({ taskId: 2, taskNo: "0002" }),
    ];
    const w = SchedulingPreconditionService.check(tasks, [dep(1, 2), dep(2, 1)], []);
    expect(w.length).toBe(1);
    expect(w[0].kind).toBe("CYCLIC_DEPENDENCY");
    expect(w[0].cycleTaskNos!.sort()).toEqual(["0001", "0002"]);
  });
});

describe("SchedulingPreconditionService.checkProjectEnd", () => {
  const scheduled = (over: Partial<ScheduledTask>): ScheduledTask => ({
    taskId: 0,
    taskNo: "0000",
    taskName: "task",
    status: "NOT_STARTED",
    isSteady: false,
    fixed: false,
    skipped: false,
    note: "NORMAL",
    predecessors: [],
    ...over,
  });

  const projectEnd = new Date(2026, 5, 16);

  test("プロジェクト終了日以内なら警告なし", () => {
    const w = SchedulingPreconditionService.checkProjectEnd(
      [
        scheduled({
          taskId: 1,
          taskNo: "0001",
          scheduledStartDate: new Date(2026, 5, 15),
          scheduledEndDate: new Date(2026, 5, 16),
        }),
      ],
      projectEnd
    );
    expect(w).toEqual([]);
  });

  test("プロジェクト終了日を超えるタスクを検出", () => {
    const w = SchedulingPreconditionService.checkProjectEnd(
      [
        scheduled({
          taskId: 1,
          taskNo: "0001",
          scheduledStartDate: new Date(2026, 5, 15),
          scheduledEndDate: new Date(2026, 5, 17),
        }),
      ],
      projectEnd
    );
    expect(w).toEqual([
      expect.objectContaining({ kind: "EXCEEDS_PROJECT_END", taskNo: "0001" }),
    ]);
  });

  test("skipタスク・日付未確定タスクは対象外", () => {
    const w = SchedulingPreconditionService.checkProjectEnd(
      [
        scheduled({ taskId: 1, taskNo: "0001", skipped: true }),
        scheduled({ taskId: 2, taskNo: "0002", scheduledEndDate: undefined }),
      ],
      projectEnd
    );
    expect(w).toEqual([]);
  });
});

describe("SchedulingPreconditionService.checkFixedDateConflicts", () => {
  const scheduled = (over: Partial<ScheduledTask>): ScheduledTask => ({
    taskId: 0,
    taskNo: "0000",
    taskName: "task",
    status: "NOT_STARTED",
    isSteady: false,
    fixed: false,
    skipped: false,
    note: "NORMAL",
    predecessors: [],
    ...over,
  });

  test("FIXED_DATE_CONFLICTのタスクを警告として抽出する", () => {
    const w = SchedulingPreconditionService.checkFixedDateConflicts([
      scheduled({ taskId: 1, taskNo: "0001", note: "FIXED_DATE" }),
      scheduled({
        taskId: 2,
        taskNo: "0002",
        taskName: "本番導入",
        note: "FIXED_DATE_CONFLICT",
      }),
    ]);
    expect(w).toEqual([
      expect.objectContaining({ kind: "FIXED_DATE_CONFLICT", taskNo: "0002" }),
    ]);
  });

  test("競合がなければ空配列", () => {
    const w = SchedulingPreconditionService.checkFixedDateConflicts([
      scheduled({ taskId: 1, taskNo: "0001", note: "FIXED_DATE" }),
    ]);
    expect(w).toEqual([]);
  });
});
