import type { Task, DependencyType } from "../gantt";
import { parseDbId } from "./taskId";

/** 依存関係を作成するための入力（createGanttDependency の引数形） */
export type CreateDependencyInput = {
  successorTaskId: number;
  predecessorTaskId: number;
  type: DependencyType;
  lag: number;
};

/** 元タスクとドラフトタスクの依存関係差分 */
export type DependencyDiff = {
  /** 削除すべき依存関係の dbId 一覧（元の順序を保持） */
  deletes: number[];
  /** 作成すべき依存関係の入力一覧（ドラフトの順序を保持） */
  creates: CreateDependencyInput[];
};

type DepInfo = {
  succ: string;
  pred: string;
  type: DependencyType;
  lag: number;
};

/**
 * 依存関係の差分（削除・作成）を算出する純粋関数。
 *
 * - 元タスク側の依存(dbId > 0)を基準に、ドラフトに存在しない/変更されたものを削除対象とする
 * - ドラフト側の依存のうち、新規(dbId <= 0)/変更されたものを作成対象とする
 * - 変更（同一dbIdで type/lag/pred のいずれかが異なる）は「削除 + 作成」になる
 *
 * 副作用は持たず、サーバー呼び出しは呼び出し側が結果に対して行う。
 */
export function diffDependencies(
  originalTasks: Task[],
  draftTasks: Task[],
): DependencyDiff {
  const origDeps = new Map<number, DepInfo>();
  originalTasks.forEach((t) =>
    t.predecessors.forEach((p) => {
      if (p.dbId !== undefined && p.dbId > 0) {
        origDeps.set(p.dbId, {
          succ: t.id,
          pred: p.taskId,
          type: p.type,
          lag: p.lag,
        });
      }
    }),
  );

  const draftDeps: (DepInfo & { dbId: number })[] = [];
  draftTasks.forEach((t) =>
    t.predecessors.forEach((p) =>
      draftDeps.push({
        dbId: p.dbId ?? 0,
        succ: t.id,
        pred: p.taskId,
        type: p.type,
        lag: p.lag,
      }),
    ),
  );

  const deletes: number[] = [];
  // 削除・変更（旧分の削除）
  for (const [dbId, od] of origDeps) {
    const inDraft = draftDeps.find((d) => d.dbId === dbId);
    const changed =
      inDraft &&
      (inDraft.type !== od.type ||
        inDraft.lag !== od.lag ||
        inDraft.pred !== od.pred);
    if (!inDraft || changed) {
      deletes.push(dbId);
    }
  }

  const creates: CreateDependencyInput[] = [];
  // 追加・変更（新分の作成）
  for (const d of draftDeps) {
    const od = d.dbId > 0 ? origDeps.get(d.dbId) : undefined;
    const isNew = d.dbId <= 0;
    const changed =
      od && (od.type !== d.type || od.lag !== d.lag || od.pred !== d.pred);
    if (isNew || changed) {
      creates.push({
        successorTaskId: parseDbId(d.succ),
        predecessorTaskId: parseDbId(d.pred),
        type: d.type,
        lag: d.lag,
      });
    }
  }

  return { deletes, creates };
}
