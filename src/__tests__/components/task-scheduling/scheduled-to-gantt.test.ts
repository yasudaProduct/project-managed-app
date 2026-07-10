import {
  scheduledToGanttTasks,
  scheduledToGanttPhases,
  applyGanttTaskToScheduled,
  scheduledToAssigneeOptions,
} from "@/components/task-scheduling/adapters/scheduled-to-gantt";
import type { ScheduledTaskDto } from "@/applications/task-scheduling/ischeduling-application-service";
import type { Task as GanttTask } from "@/components/gantt/gantt";

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

describe("applyGanttTaskToScheduled", () => {
  const baseDtos = [
    dto({
      taskId: 1,
      scheduledStartDate: "2026-06-15T00:00:00.000Z",
      scheduledEndDate: "2026-06-16T00:00:00.000Z",
      scheduledManHours: 8,
      assigneeId: 10,
      assigneeName: "山田",
    }),
    dto({
      taskId: 2,
      scheduledStartDate: "2026-06-17T00:00:00.000Z",
      scheduledEndDate: "2026-06-17T00:00:00.000Z",
      scheduledManHours: 4,
    }),
  ];

  const ganttTask = (over: Partial<GanttTask>): GanttTask => ({
    id: "1",
    dbId: 1,
    name: "A",
    startDate: new Date("2026-06-15T00:00:00.000Z"),
    endDate: new Date("2026-06-16T00:00:00.000Z"),
    duration: 8,
    color: "#000",
    isMilestone: false,
    progress: 0,
    predecessors: [],
    level: 0,
    isManuallyScheduled: false,
    ...over,
  });

  test("編集された日付・工数・担当者を対象DTOにだけ反映する", () => {
    const updated = applyGanttTaskToScheduled(
      baseDtos,
      ganttTask({
        startDate: new Date("2026-06-18T00:00:00.000Z"),
        endDate: new Date("2026-06-19T00:00:00.000Z"),
        duration: 12,
        assigneeId: 20,
        assignee: "佐藤",
      })
    );
    const t1 = updated.find((d) => d.taskId === 1)!;
    expect(t1.scheduledStartDate).toBe("2026-06-18T00:00:00.000Z");
    expect(t1.scheduledEndDate).toBe("2026-06-19T00:00:00.000Z");
    expect(t1.scheduledManHours).toBe(12);
    expect(t1.assigneeId).toBe(20);
    expect(t1.assigneeName).toBe("佐藤");
    // 他のDTOは非破壊・不変
    expect(updated.find((d) => d.taskId === 2)).toEqual(baseDtos[1]);
    expect(baseDtos[0].scheduledStartDate).toBe("2026-06-15T00:00:00.000Z");
  });

  test("対象IDが存在しなければそのまま返す", () => {
    const updated = applyGanttTaskToScheduled(
      baseDtos,
      ganttTask({ dbId: 999 })
    );
    expect(updated).toEqual(baseDtos);
  });
});

describe("scheduledToAssigneeOptions", () => {
  test("結果内のユニークな担当者一覧を返す", () => {
    const options = scheduledToAssigneeOptions([
      dto({ taskId: 1, assigneeId: 10, assigneeName: "山田" }),
      dto({ taskId: 2, assigneeId: 10, assigneeName: "山田" }),
      dto({ taskId: 3, assigneeId: 20, assigneeName: "佐藤" }),
      dto({ taskId: 4, assigneeId: undefined }),
    ]);
    expect(options).toEqual([
      { id: 10, name: "山田" },
      { id: 20, name: "佐藤" },
    ]);
  });
});
