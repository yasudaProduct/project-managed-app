import { diffDependencies } from "@/components/ganttv3/utils/diffDependencies";
import type { Task, DependencyType } from "@/components/ganttv3/gantt";

type PredSpec = {
  taskId: string;
  type?: DependencyType;
  lag?: number;
  dbId?: number;
};

function task(id: string, preds: PredSpec[] = []): Task {
  return {
    id,
    name: id,
    startDate: new Date("2024-01-01T00:00:00.000Z"),
    endDate: new Date("2024-01-03T00:00:00.000Z"),
    duration: 2,
    color: "#000000",
    isMilestone: false,
    progress: 0,
    predecessors: preds.map((p) => ({
      taskId: p.taskId,
      type: p.type ?? "FS",
      lag: p.lag ?? 0,
      dbId: p.dbId,
    })),
    level: 0,
    isManuallyScheduled: false,
  };
}

describe("diffDependencies", () => {
  it("変更がなければ削除も作成もしない", () => {
    const orig = [task("10"), task("20", [{ taskId: "10", dbId: 1 }])];
    const draft = [task("10"), task("20", [{ taskId: "10", dbId: 1 }])];
    expect(diffDependencies(orig, draft)).toEqual({ deletes: [], creates: [] });
  });

  it("接頭辞付きID(task-<dbId>)から数値のdbIdを取り出して作成する", () => {
    const orig = [task("task-10"), task("task-20")];
    const draft = [task("task-10"), task("task-20", [{ taskId: "task-10" }])];
    expect(diffDependencies(orig, draft)).toEqual({
      deletes: [],
      creates: [
        { successorTaskId: 20, predecessorTaskId: 10, type: "FS", lag: 0 },
      ],
    });
  });

  it("新規依存（dbId未設定）は作成のみ", () => {
    const orig = [task("10"), task("20")];
    const draft = [task("10"), task("20", [{ taskId: "10" }])];
    expect(diffDependencies(orig, draft)).toEqual({
      deletes: [],
      creates: [
        { successorTaskId: 20, predecessorTaskId: 10, type: "FS", lag: 0 },
      ],
    });
  });

  it("削除された依存は削除のみ", () => {
    const orig = [task("10"), task("20", [{ taskId: "10", dbId: 1 }])];
    const draft = [task("10"), task("20")];
    expect(diffDependencies(orig, draft)).toEqual({
      deletes: [1],
      creates: [],
    });
  });

  it("ラグ変更は削除 + 作成になる", () => {
    const orig = [task("10"), task("20", [{ taskId: "10", dbId: 1, lag: 0 }])];
    const draft = [task("10"), task("20", [{ taskId: "10", dbId: 1, lag: 3 }])];
    expect(diffDependencies(orig, draft)).toEqual({
      deletes: [1],
      creates: [
        { successorTaskId: 20, predecessorTaskId: 10, type: "FS", lag: 3 },
      ],
    });
  });

  it("先行タスク変更は削除 + 作成になる", () => {
    const orig = [
      task("10"),
      task("30"),
      task("20", [{ taskId: "10", dbId: 1 }]),
    ];
    const draft = [
      task("10"),
      task("30"),
      task("20", [{ taskId: "30", dbId: 1 }]),
    ];
    expect(diffDependencies(orig, draft)).toEqual({
      deletes: [1],
      creates: [
        { successorTaskId: 20, predecessorTaskId: 30, type: "FS", lag: 0 },
      ],
    });
  });

  it("種別変更は削除 + 作成になる", () => {
    const orig = [task("10"), task("20", [{ taskId: "10", dbId: 1, type: "FS" }])];
    const draft = [task("10"), task("20", [{ taskId: "10", dbId: 1, type: "SS" }])];
    expect(diffDependencies(orig, draft)).toEqual({
      deletes: [1],
      creates: [
        { successorTaskId: 20, predecessorTaskId: 10, type: "SS", lag: 0 },
      ],
    });
  });
});
