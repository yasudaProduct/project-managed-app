import { toWbsTask } from "@/components/ganttv3/utils/taskMapper";
import type { Task } from "@/components/ganttv3/gantt";

function makeTask(p: Partial<Task> & { id: string }): Task {
  return {
    name: p.id,
    startDate: new Date("2024-01-01T00:00:00.000Z"),
    endDate: new Date("2024-01-03T00:00:00.000Z"),
    duration: 2,
    color: "#000000",
    isMilestone: false,
    progress: 0,
    predecessors: [],
    level: 0,
    isManuallyScheduled: false,
    ...p,
  };
}

describe("toWbsTask", () => {
  it("dbId があれば id に採用し、なければ id を数値化する", () => {
    expect(toWbsTask(makeTask({ id: "t-1", dbId: 42 })).id).toBe(42);
    expect(toWbsTask(makeTask({ id: "7" })).id).toBe(7);
  });

  it("status は未設定なら NOT_STARTED、設定済みならそのまま", () => {
    expect(toWbsTask(makeTask({ id: "1" })).status).toBe("NOT_STARTED");
    expect(toWbsTask(makeTask({ id: "1", status: "IN_PROGRESS" })).status).toBe(
      "IN_PROGRESS",
    );
  });

  it("assigneeId があれば assignee オブジェクトを生成する", () => {
    const w = toWbsTask(
      makeTask({ id: "1", assigneeId: 5, assignee: "山田" }),
    );
    expect(w.assigneeId).toBe(5);
    expect(w.assignee).toEqual({ id: 5, name: "山田", displayName: "山田" });
  });

  it("assigneeId がなければ assignee は undefined", () => {
    expect(toWbsTask(makeTask({ id: "1" })).assignee).toBeUndefined();
  });

  it("phaseId があれば phase オブジェクト（name は category）を生成する", () => {
    const w = toWbsTask(makeTask({ id: "1", phaseId: 3, category: "設計" }));
    expect(w.phase).toEqual({ id: 3, name: "設計", seq: 0 });
  });

  it("予定の開始・終了・工数をマッピングする", () => {
    const start = new Date("2024-02-01T00:00:00.000Z");
    const end = new Date("2024-02-10T00:00:00.000Z");
    const w = toWbsTask(
      makeTask({ id: "1", startDate: start, endDate: end, duration: 9 }),
    );
    expect(w.yoteiStart).toBe(start);
    expect(w.yoteiEnd).toBe(end);
    expect(w.yoteiKosu).toBe(9);
  });
});
