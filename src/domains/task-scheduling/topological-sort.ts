export interface TopoEdge {
  from: number; // 先行ノード(predecessor)
  to: number; // 後続ノード(successor)
}

export interface TopoSortResult {
  /** トポロジカル順に並んだノード（先行が先）。同列は数値ID昇順で安定 */
  ordered: number[];
  /** 循環に含まれ順序付けできなかったノード（昇順） */
  cyclicNodes: number[];
}

/**
 * Kahn法によるトポロジカルソート。
 * 入次数0のノードを数値ID昇順で取り出すことで安定した順序を返す。
 * 循環があるノードは ordered に含めず cyclicNodes として返す。
 */
export function topologicalSort(
  nodeIds: number[],
  edges: TopoEdge[]
): TopoSortResult {
  const inDegree = new Map<number, number>();
  const adj = new Map<number, number[]>();
  for (const id of nodeIds) {
    inDegree.set(id, 0);
    adj.set(id, []);
  }
  for (const e of edges) {
    // nodeIds に含まれないノードを指すエッジは無視する
    if (!inDegree.has(e.from) || !inDegree.has(e.to)) continue;
    adj.get(e.from)!.push(e.to);
    inDegree.set(e.to, inDegree.get(e.to)! + 1);
  }

  const ordered: number[] = [];
  const available: number[] = nodeIds
    .filter((id) => inDegree.get(id) === 0)
    .sort((a, b) => a - b);

  while (available.length > 0) {
    const n = available.shift()!;
    ordered.push(n);
    for (const m of (adj.get(n) ?? []).slice().sort((a, b) => a - b)) {
      const deg = inDegree.get(m)! - 1;
      inDegree.set(m, deg);
      if (deg === 0) {
        insertSorted(available, m);
      }
    }
  }

  const orderedSet = new Set(ordered);
  const cyclicNodes = nodeIds
    .filter((id) => !orderedSet.has(id))
    .sort((a, b) => a - b);

  return { ordered, cyclicNodes };
}

/** 昇順を保ったまま値を挿入する */
function insertSorted(arr: number[], v: number): void {
  let lo = 0;
  let hi = arr.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (arr[mid] < v) lo = mid + 1;
    else hi = mid;
  }
  arr.splice(lo, 0, v);
}
