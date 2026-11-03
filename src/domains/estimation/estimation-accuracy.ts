/**
 * 見積精度の集計（ドメインサービス）。Q7「次のプロジェクトに何を活かすか」に答えるため、
 * 完了タスクについてグループごとに「実績 / 基準」比と、基準を超えたタスクの割合を求める。
 */

export type EstimationAccuracyItem = {
  groupKey: string;
  label: string;
  projectId: string;
  baselineHours: number;
  actualHours: number;
};

export type EstimationAccuracyRow = {
  key: string;
  label: string;
  projectCount: number;
  taskCount: number;
  baselineHours: number;
  actualHours: number;
  /** 実績 / 基準。1を超えると見積より多くかかった。基準の合計が0なら null */
  actualToBaselineRatio: number | null;
  /** 実績が基準を上回ったタスクの割合（%） */
  overrunTaskRatePct: number;
};

/** グループは入力に最初に現れた順に並べる */
export function summarizeEstimationAccuracy(
  items: ReadonlyArray<EstimationAccuracyItem>
): EstimationAccuracyRow[] {
  const groups = new Map<
    string,
    { label: string; projectIds: Set<string>; taskCount: number; overrunCount: number; baselineHours: number; actualHours: number }
  >();
  for (const item of items) {
    const group = groups.get(item.groupKey) ?? {
      label: item.label,
      projectIds: new Set<string>(),
      taskCount: 0,
      overrunCount: 0,
      baselineHours: 0,
      actualHours: 0,
    };
    group.projectIds.add(item.projectId);
    group.taskCount += 1;
    if (item.actualHours > item.baselineHours) group.overrunCount += 1;
    group.baselineHours += item.baselineHours;
    group.actualHours += item.actualHours;
    groups.set(item.groupKey, group);
  }

  return Array.from(groups, ([key, group]) => ({
    key,
    label: group.label,
    projectCount: group.projectIds.size,
    taskCount: group.taskCount,
    baselineHours: group.baselineHours,
    actualHours: group.actualHours,
    actualToBaselineRatio: group.baselineHours > 0 ? group.actualHours / group.baselineHours : null,
    overrunTaskRatePct: (group.overrunCount / group.taskCount) * 100,
  }));
}
