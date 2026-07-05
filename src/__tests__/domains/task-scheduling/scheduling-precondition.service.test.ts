import { SchedulingPreconditionService } from "@/domains/task-scheduling/scheduling-precondition-service";
import type { SchedulingTask } from "@/domains/task-scheduling/scheduling-task";
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
