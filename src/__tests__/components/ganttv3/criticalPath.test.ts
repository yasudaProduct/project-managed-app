import {
  calculateCriticalPath,
  impliedStart,
} from "@/components/ganttv3/utils/criticalPath";
import type { Task, Dependency, DependencyType } from "@/components/ganttv3/gantt";

const DAY = 24 * 60 * 60 * 1000;
const base = Date.UTC(2024, 0, 1); // 2024-01-01T00:00:00.000Z
const day = (n: number) => new Date(base + n * DAY);

function makeTask(
  partial: Partial<Task> & { id: string; startDate: Date; duration: number },
): Task {
  return {
    name: partial.id,
    endDate: new Date(partial.startDate.getTime() + partial.duration * DAY),
    color: "#000000",
    isMilestone: false,
    progress: 0,
    predecessors: [],
    level: 0,
    isManuallyScheduled: false,
    ...partial,
  };
}

function dep(taskId: string, type: DependencyType = "FS", lag = 0): Dependency {
  return { taskId, type, lag };
}

describe("impliedStart", () => {
  // 先行: 開始=10日目, 終了=15日目 / 後続: 期間=2日 と仮定
  const predStart = day(10).getTime();
  const predFinish = day(15).getTime();
  const successorDuration = 2;

  it("FS: 先行終了 + ラグ", () => {
    expect(impliedStart(predStart, predFinish, successorDuration, "FS", 0)).toBe(
      predFinish,
    );
    expect(impliedStart(predStart, predFinish, successorDuration, "FS", 3)).toBe(
      predFinish + 3 * DAY,
    );
  });

  it("SS: 先行開始 + ラグ", () => {
    expect(impliedStart(predStart, predFinish, successorDuration, "SS", 0)).toBe(
      predStart,
    );
    expect(impliedStart(predStart, predFinish, successorDuration, "SS", 2)).toBe(
      predStart + 2 * DAY,
    );
  });

  it("FF: 先行終了 + ラグ - 後続期間", () => {
    expect(impliedStart(predStart, predFinish, successorDuration, "FF", 0)).toBe(
      predFinish - successorDuration * DAY,
    );
    expect(impliedStart(predStart, predFinish, successorDuration, "FF", 1)).toBe(
      predFinish + 1 * DAY - successorDuration * DAY,
    );
  });

  it("SF: 先行開始 + ラグ - 後続期間", () => {
    expect(impliedStart(predStart, predFinish, successorDuration, "SF", 0)).toBe(
      predStart - successorDuration * DAY,
    );
  });
});

describe("calculateCriticalPath", () => {
  it("空配列は空配列を返す", () => {
    expect(calculateCriticalPath([])).toEqual([]);
  });

  it("単一タスクはクリティカルパス上になる", () => {
    const a = makeTask({ id: "A", startDate: day(0), duration: 2 });
    const [result] = calculateCriticalPath([a]);
    expect(result.isOnCriticalPath).toBe(true);
  });

  it("入力タスクを破壊的に変更せず、新しいオブジェクトを返す", () => {
    const a = makeTask({ id: "A", startDate: day(0), duration: 2 });
    const result = calculateCriticalPath([a]);
    expect(result[0]).not.toBe(a);
    expect(a.isOnCriticalPath).toBeUndefined();
  });

  it("全ての返り値タスクで isOnCriticalPath が boolean になる", () => {
    const tasks = [
      makeTask({ id: "A", startDate: day(0), duration: 2 }),
      makeTask({
        id: "B",
        startDate: day(2),
        duration: 2,
        predecessors: [dep("A")],
      }),
    ];
    for (const t of calculateCriticalPath(tasks)) {
      expect(typeof t.isOnCriticalPath).toBe("boolean");
    }
  });

  it("余裕のない直列チェーン(FS)は全てクリティカル", () => {
    // A: 0-2日, B: 2-4日 (A終了とB開始が一致)
    const tasks = [
      makeTask({ id: "A", startDate: day(0), duration: 2 }),
      makeTask({
        id: "B",
        startDate: day(2),
        duration: 2,
        predecessors: [dep("A", "FS", 0)],
      }),
    ];
    const byId = new Map(
      calculateCriticalPath(tasks).map((t) => [t.id, t.isOnCriticalPath]),
    );
    expect(byId.get("A")).toBe(true);
    expect(byId.get("B")).toBe(true);
  });

  it("後続に余裕がある場合、律速していない先行はクリティカルでない", () => {
    // A: 0-2日, B: 9日開始(A終了から余裕あり)
    const tasks = [
      makeTask({ id: "A", startDate: day(0), duration: 2 }),
      makeTask({
        id: "B",
        startDate: day(9),
        duration: 2,
        predecessors: [dep("A", "FS", 0)],
      }),
    ];
    const byId = new Map(
      calculateCriticalPath(tasks).map((t) => [t.id, t.isOnCriticalPath]),
    );
    expect(byId.get("A")).toBe(false);
    expect(byId.get("B")).toBe(true);
  });

  it("並列先行のうち、開始を律速するものだけがクリティカル", () => {
    // A1: 0-5日(律速), A2: 0-2日(余裕あり), B: 5日開始
    const tasks = [
      makeTask({ id: "A1", startDate: day(0), duration: 5 }),
      makeTask({ id: "A2", startDate: day(0), duration: 2 }),
      makeTask({
        id: "B",
        startDate: day(5),
        duration: 1,
        predecessors: [dep("A1", "FS", 0), dep("A2", "FS", 0)],
      }),
    ];
    const byId = new Map(
      calculateCriticalPath(tasks).map((t) => [t.id, t.isOnCriticalPath]),
    );
    expect(byId.get("A1")).toBe(true);
    expect(byId.get("A2")).toBe(false);
    expect(byId.get("B")).toBe(true);
  });

  it("マイルストーンは終端タスクとして扱われ、律速する先行もクリティカルになる", () => {
    // A: 0-4日, M(マイルストーン): 4日 / A終了でMが律速される
    const tasks = [
      makeTask({ id: "A", startDate: day(0), duration: 4 }),
      makeTask({
        id: "M",
        startDate: day(4),
        duration: 0,
        isMilestone: true,
        predecessors: [dep("A", "FS", 0)],
      }),
    ];
    const byId = new Map(
      calculateCriticalPath(tasks).map((t) => [t.id, t.isOnCriticalPath]),
    );
    expect(byId.get("M")).toBe(true);
    expect(byId.get("A")).toBe(true);
  });

  it("循環依存があっても無限ループせず結果を返す", () => {
    const tasks = [
      makeTask({
        id: "A",
        startDate: day(0),
        duration: 2,
        predecessors: [dep("B", "FS", 0)],
      }),
      makeTask({
        id: "B",
        startDate: day(0),
        duration: 2,
        predecessors: [dep("A", "FS", 0)],
      }),
    ];
    const result = calculateCriticalPath(tasks);
    expect(result).toHaveLength(2);
    for (const t of result) {
      expect(typeof t.isOnCriticalPath).toBe("boolean");
    }
  });
});
