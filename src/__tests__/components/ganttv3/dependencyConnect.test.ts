import {
  deriveDependencyType,
  validateConnect,
  hitTestTaskBar,
  connectSideAt,
  type TaskBarHitBox,
} from "@/components/ganttv3/utils/dependencyConnect";
import { makeTask, makeDependency } from "./_fixtures";

describe("deriveDependencyType", () => {
  it.each([
    ["end", "start", "FS"],
    ["start", "start", "SS"],
    ["end", "end", "FF"],
    ["start", "end", "SF"],
  ] as const)(
    "先行の%s → 後続の%s は %s",
    (fromSide, toSide, expected) => {
      expect(deriveDependencyType(fromSide, toSide)).toBe(expected);
    },
  );
});

describe("validateConnect", () => {
  const byId = (tasks: ReturnType<typeof makeTask>[]) =>
    new Map(tasks.map((t) => [t.id, t]));

  it("独立した2タスクの接続は ok", () => {
    const tasks = byId([makeTask({ id: "A" }), makeTask({ id: "B" })]);
    expect(validateConnect(tasks, "A", "B")).toEqual({ ok: true });
  });

  it("自分自身への接続は self で拒否", () => {
    const tasks = byId([makeTask({ id: "A" })]);
    expect(validateConnect(tasks, "A", "A")).toEqual({
      ok: false,
      reason: "self",
    });
  });

  it("マイルストーンが先行・後続いずれでも milestone で拒否", () => {
    const tasks = byId([
      makeTask({ id: "A" }),
      makeTask({ id: "M", isMilestone: true }),
    ]);
    expect(validateConnect(tasks, "M", "A")).toEqual({
      ok: false,
      reason: "milestone",
    });
    expect(validateConnect(tasks, "A", "M")).toEqual({
      ok: false,
      reason: "milestone",
    });
  });

  it("既に同じ先行を持つ場合は duplicate で拒否", () => {
    const tasks = byId([
      makeTask({ id: "A" }),
      makeTask({ id: "B", predecessors: [makeDependency("A")] }),
    ]);
    expect(validateConnect(tasks, "A", "B")).toEqual({
      ok: false,
      reason: "duplicate",
    });
  });

  it("直接の循環（後続がすでに先行）は cycle で拒否", () => {
    const tasks = byId([
      makeTask({ id: "A", predecessors: [makeDependency("B")] }),
      makeTask({ id: "B" }),
    ]);
    // A は B に依存済み。B に A を先行として足すと A⇄B の循環になる
    expect(validateConnect(tasks, "A", "B")).toEqual({
      ok: false,
      reason: "cycle",
    });
  });

  it("推移的な循環（A→B→C の状態で C を A の先行にする）も cycle で拒否", () => {
    const tasks = byId([
      makeTask({ id: "A" }),
      makeTask({ id: "B", predecessors: [makeDependency("A")] }),
      makeTask({ id: "C", predecessors: [makeDependency("B")] }),
    ]);
    expect(validateConnect(tasks, "C", "A")).toEqual({
      ok: false,
      reason: "cycle",
    });
  });

  it("マップに存在しないタスクは unknown で拒否", () => {
    const tasks = byId([makeTask({ id: "A" })]);
    expect(validateConnect(tasks, "A", "X")).toEqual({
      ok: false,
      reason: "unknown",
    });
    expect(validateConnect(tasks, "X", "A")).toEqual({
      ok: false,
      reason: "unknown",
    });
  });
});

describe("hitTestTaskBar", () => {
  const boxes: TaskBarHitBox[] = [
    { taskId: "A", x: 100, endX: 200, top: 20, height: 20 },
    { taskId: "B", x: 240, endX: 400, top: 40, height: 20 },
  ];

  it("バー内の点はそのバーを返す", () => {
    expect(hitTestTaskBar(boxes, 150, 30)?.taskId).toBe("A");
    expect(hitTestTaskBar(boxes, 300, 50)?.taskId).toBe("B");
  });

  it("X がバー範囲外なら null（行内でもバーの左右は対象外）", () => {
    expect(hitTestTaskBar(boxes, 220, 50)).toBeNull(); // Bの行だがバーより左
    expect(hitTestTaskBar(boxes, 500, 50)).toBeNull();
  });

  it("Y が行範囲外なら null", () => {
    expect(hitTestTaskBar(boxes, 150, 10)).toBeNull();
    expect(hitTestTaskBar(boxes, 150, 70)).toBeNull();
  });

  it("境界: X はバー両端を含み、Y は上端を含み下端を含まない", () => {
    expect(hitTestTaskBar(boxes, 100, 20)?.taskId).toBe("A");
    expect(hitTestTaskBar(boxes, 200, 39)?.taskId).toBe("A");
    expect(hitTestTaskBar(boxes, 150, 40)?.taskId).toBe("B"); // Aの下端＝Bの上端
  });
});

describe("connectSideAt", () => {
  const box: TaskBarHitBox = { taskId: "A", x: 100, endX: 200, top: 0, height: 20 };

  it("バー中央より左は start、右は end", () => {
    expect(connectSideAt(box, 120)).toBe("start");
    expect(connectSideAt(box, 180)).toBe("end");
  });

  it("中央ちょうどは end（右半分扱い）", () => {
    expect(connectSideAt(box, 150)).toBe("end");
  });
});
