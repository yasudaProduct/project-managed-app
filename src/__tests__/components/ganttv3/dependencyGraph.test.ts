import {
  wouldCreateCycle,
  type DependencyNode,
} from "@/components/ganttv3/utils/dependencyGraph";

/** taskId -> 先行taskId配列 からノードマップを作る簡易ヘルパー */
function graph(edges: Record<string, string[]>): Map<string, DependencyNode> {
  return new Map(
    Object.entries(edges).map(([id, preds]) => [
      id,
      { predecessors: preds.map((taskId) => ({ taskId })) },
    ]),
  );
}

describe("wouldCreateCycle", () => {
  it("候補が対象自身なら循環", () => {
    const g = graph({ A: [], B: [] });
    expect(wouldCreateCycle(g, "A", "A")).toBe(true);
  });

  it("候補が対象に直接依存している場合は循環", () => {
    // B は A に依存。A に B を先行追加すると A→B→A
    const g = graph({ A: [], B: ["A"] });
    expect(wouldCreateCycle(g, "A", "B")).toBe(true);
  });

  it("候補が対象に間接依存している場合は循環", () => {
    // C→B→A。A に C を先行追加すると循環
    const g = graph({ A: [], B: ["A"], C: ["B"] });
    expect(wouldCreateCycle(g, "A", "C")).toBe(true);
  });

  it("対象に到達しない候補は循環でない", () => {
    const g = graph({ A: [], B: [], C: ["B"] });
    expect(wouldCreateCycle(g, "A", "C")).toBe(false);
  });

  it("マップに存在しない候補IDは循環でない", () => {
    const g = graph({ A: [] });
    expect(wouldCreateCycle(g, "A", "X")).toBe(false);
  });

  it("グラフ自体に循環があっても無限ループせず判定を返す", () => {
    // B→C→B の循環。対象 A には到達しない
    const g = graph({ A: [], B: ["C"], C: ["B"] });
    expect(wouldCreateCycle(g, "A", "B")).toBe(false);
  });

  it("ダイヤモンド構造で対象に到達するなら循環", () => {
    // D→B→A, D→C→A。A に D を先行追加すると循環
    const g = graph({ A: [], B: ["A"], C: ["A"], D: ["B", "C"] });
    expect(wouldCreateCycle(g, "A", "D")).toBe(true);
  });
});
