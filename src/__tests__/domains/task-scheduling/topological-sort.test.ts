import { topologicalSort } from "@/domains/task-scheduling/topological-sort";

describe("topologicalSort", () => {
  test("直列の依存を順序付ける", () => {
    const r = topologicalSort([1, 2, 3], [
      { from: 1, to: 2 },
      { from: 2, to: 3 },
    ]);
    expect(r.cyclicNodes).toEqual([]);
    expect(r.ordered.indexOf(1)).toBeLessThan(r.ordered.indexOf(2));
    expect(r.ordered.indexOf(2)).toBeLessThan(r.ordered.indexOf(3));
  });

  test("分岐・合流を順序付ける", () => {
    const r = topologicalSort([1, 2, 3, 4], [
      { from: 1, to: 2 },
      { from: 1, to: 3 },
      { from: 2, to: 4 },
      { from: 3, to: 4 },
    ]);
    expect(r.cyclicNodes).toEqual([]);
    expect(r.ordered.indexOf(1)).toBeLessThan(r.ordered.indexOf(2));
    expect(r.ordered.indexOf(1)).toBeLessThan(r.ordered.indexOf(3));
    expect(r.ordered.indexOf(2)).toBeLessThan(r.ordered.indexOf(4));
    expect(r.ordered.indexOf(3)).toBeLessThan(r.ordered.indexOf(4));
  });

  test("依存のない独立ノードを昇順で返す", () => {
    const r = topologicalSort([3, 1, 2], []);
    expect(r.cyclicNodes).toEqual([]);
    expect(r.ordered).toEqual([1, 2, 3]);
  });

  test("入次数0が同時に複数ある場合は昇順で安定", () => {
    const r = topologicalSort([2, 1, 3], [
      { from: 1, to: 3 },
      { from: 2, to: 3 },
    ]);
    expect(r.ordered).toEqual([1, 2, 3]);
  });

  test("循環を残余ノードとして検出する", () => {
    const r = topologicalSort([1, 2, 3], [
      { from: 1, to: 2 },
      { from: 2, to: 3 },
      { from: 3, to: 1 },
    ]);
    expect(r.cyclicNodes.sort((a, b) => a - b)).toEqual([1, 2, 3]);
    expect(r.ordered).toEqual([]);
  });

  test("循環と非循環が混在する場合は非循環のみ順序付ける", () => {
    const r = topologicalSort([1, 2, 3, 4], [
      { from: 1, to: 2 },
      { from: 2, to: 1 },
      { from: 3, to: 4 },
    ]);
    expect(r.cyclicNodes.sort((a, b) => a - b)).toEqual([1, 2]);
    expect(r.ordered.indexOf(3)).toBeLessThan(r.ordered.indexOf(4));
  });

  test("nodeIds外を指すエッジは無視する", () => {
    const r = topologicalSort([1, 2], [
      { from: 1, to: 2 },
      { from: 2, to: 99 },
    ]);
    expect(r.cyclicNodes).toEqual([]);
    expect(r.ordered).toEqual([1, 2]);
  });
});
