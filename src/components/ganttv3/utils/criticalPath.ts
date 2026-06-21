import type { Task, DependencyType } from "../gantt";

const DAY = 24 * 60 * 60 * 1000;

/**
 * 依存種別とラグから、後続タスクの最早開始の下限を算出する。
 *
 * @param predStart 先行タスクの開始時刻(ms)
 * @param predFinish 先行タスクの終了時刻(ms)
 * @param successorDuration 後続タスクの期間(日)
 * @param type 依存種別(FS/SS/FF/SF)
 * @param lag ラグ(日)
 */
export function impliedStart(
  predStart: number,
  predFinish: number,
  successorDuration: number,
  type: DependencyType,
  lag: number,
): number {
  const lagMs = lag * DAY;
  const durMs = successorDuration * DAY;
  switch (type) {
    case "SS":
      return predStart + lagMs;
    case "FF":
      return predFinish + lagMs - durMs;
    case "SF":
      return predStart + lagMs - durMs;
    case "FS":
    default:
      return predFinish + lagMs;
  }
}

/**
 * クリティカルパスを計算し、各タスクに `isOnCriticalPath` を付与した新しい配列を返す。
 *
 * 前方計算で各タスクの最早開始を求め、終端タスク(マイルストーン or 後続なし)から
 * 後方に辿り、開始を律速している(余裕ゼロの)依存をクリティカルとしてマークする。
 * 入力配列・要素は破壊的に変更しない。
 */
export function calculateCriticalPath(updatedTasks: Task[]): Task[] {
  const taskMap = new Map(
    updatedTasks.map((task) => [task.id, { ...task, isOnCriticalPath: false }]),
  );

  // 各タスクの最早開始時刻（メモ化）
  const earliestStartCache = new Map<string, number>();
  const calculateEarliestStart = (
    taskId: string,
    visited = new Set<string>(),
  ): number => {
    const cached = earliestStartCache.get(taskId);
    if (cached !== undefined) return cached;
    if (visited.has(taskId)) return 0;
    visited.add(taskId);

    const task = taskMap.get(taskId);
    if (!task) return 0;

    let earliestStart = task.startDate.getTime();

    for (const pred of task.predecessors) {
      const predTask = taskMap.get(pred.taskId);
      if (predTask) {
        const predStart = calculateEarliestStart(pred.taskId, visited);
        const predFinish = predStart + predTask.duration * DAY;
        earliestStart = Math.max(
          earliestStart,
          impliedStart(
            predStart,
            predFinish,
            task.duration,
            pred.type,
            pred.lag,
          ),
        );
      }
    }

    earliestStartCache.set(taskId, earliestStart);
    return earliestStart;
  };

  // 全タスクの最早開始を確定
  for (const task of updatedTasks) {
    calculateEarliestStart(task.id);
  }

  const criticalTasks = new Set<string>();

  const endTasks = updatedTasks.filter(
    (t) =>
      t.isMilestone ||
      !updatedTasks.some((other) =>
        other.predecessors.some((pred) => pred.taskId === t.id),
      ),
  );

  const markCriticalPath = (taskId: string, visited = new Set<string>()) => {
    if (visited.has(taskId)) return;
    visited.add(taskId);

    const task = taskMap.get(taskId);
    if (!task) return;

    criticalTasks.add(taskId);

    const taskStart = earliestStartCache.get(taskId) ?? 0;

    for (const pred of task.predecessors) {
      const predTask = taskMap.get(pred.taskId);
      if (predTask) {
        const predStart = earliestStartCache.get(pred.taskId) ?? 0;
        const predFinish = predStart + predTask.duration * DAY;
        const implied = impliedStart(
          predStart,
          predFinish,
          task.duration,
          pred.type,
          pred.lag,
        );

        // この依存が後続の開始を律速している（余裕ゼロ）ならクリティカル
        if (Math.abs(implied - taskStart) < DAY) {
          markCriticalPath(pred.taskId, visited);
        }
      }
    }
  };

  for (const endTask of endTasks) {
    markCriticalPath(endTask.id);
  }

  return updatedTasks.map((task) => ({
    ...task,
    isOnCriticalPath: criticalTasks.has(task.id),
  }));
}
