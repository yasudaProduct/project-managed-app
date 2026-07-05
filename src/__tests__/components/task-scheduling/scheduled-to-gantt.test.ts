import {
  scheduledToGanttTasks,
  scheduledToGanttPhases,
} from "@/components/task-scheduling/adapters/scheduled-to-gantt";
import type { ScheduledTaskDto } from "@/applications/task-scheduling/ischeduling-application-service";

const dto = (over: Partial<ScheduledTaskDto>): ScheduledTaskDto => ({
  taskId: 1,
  taskNo: "0001",
  taskName: "A",
  status: "NOT_STARTED",
  isSteady: false,
  fixed: false,
  skipped: false,
  note: "NORMAL",
  predecessors: [],
  ...over,
});

describe("scheduledToGanttTasks", () => {
  test("日付未確定/skipタスクは除外する", () => {
    const tasks = scheduledToGanttTasks([
      dto({ taskId: 1, skipped: true }),
      dto({ taskId: 2, scheduledStartDate: undefined }),
      dto({
        taskId: 3,
        scheduledStartDate: "2026-06-15T00:00:00.000Z",
        scheduledEndDate: "2026-06-16T00:00:00.000Z",
      }),
    ]);
    expect(tasks.map((t) => t.id)).toEqual(["3"]);
  });

  test("日付をDateに変換し依存を文字列IDで透過する", () => {
    const tasks = scheduledToGanttTasks([
      dto({
        taskId: 3,
        scheduledStartDate: "2026-06-15T00:00:00.000Z",
        scheduledEndDate: "2026-06-16T00:00:00.000Z",
        predecessors: [{ taskId: 1, type: "FS", lag: 0 }],
      }),
    ]);
    expect(tasks[0].startDate).toEqual(new Date("2026-06-15T00:00:00.000Z"));
    expect(tasks[0].predecessors).toEqual([
      { taskId: "1", type: "FS", lag: 0 },
    ]);
  });
});

describe("scheduledToGanttPhases", () => {
  test("ユニークなフェーズを出現順に生成する", () => {
    const phases = scheduledToGanttPhases([
      dto({ taskId: 1, phaseId: 10, phaseName: "設計" }),
      dto({ taskId: 2, phaseId: 10, phaseName: "設計" }),
      dto({ taskId: 3, phaseId: 20, phaseName: "実装" }),
    ]);
    expect(phases.map((p) => p.name)).toEqual(["設計", "実装"]);
    expect(phases.map((p) => p.id)).toEqual(["10", "20"]);
  });
});
