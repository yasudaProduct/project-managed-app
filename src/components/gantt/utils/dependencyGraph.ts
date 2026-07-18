/**
 * 依存グラフ上のノード。先行タスク(predecessors)の taskId のみを参照する最小構造。
 * `Map<string, Task>` をそのまま渡せる。
 */
export type DependencyNode = {
  predecessors: { taskId: string }[];
};

/**
 * `targetTaskId` に `predecessorId` を先行として追加すると循環依存になるかを判定する。
 *
 * `predecessorId` から先行方向に辿り、`targetTaskId` に到達できれば循環。
 * グラフ自体に循環があっても visited で打ち切るため無限ループしない。
 *
 * @param taskById タスクIDからノードを引くマップ
 * @param targetTaskId 先行を追加しようとしている対象タスクのID
 * @param predecessorId 追加候補の先行タスクのID
 */
export function wouldCreateCycle(
  taskById: ReadonlyMap<string, DependencyNode>,
  targetTaskId: string,
  predecessorId: string,
): boolean {
  const visited = new Set<string>();
  const stack = [predecessorId];
  while (stack.length > 0) {
    const current = stack.pop()!;
    if (current === targetTaskId) return true;
    if (visited.has(current)) continue;
    visited.add(current);
    const node = taskById.get(current);
    node?.predecessors.forEach((p) => stack.push(p.taskId));
  }
  return false;
}
