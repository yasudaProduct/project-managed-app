"use client";

import { useCallback } from "react";
import { getCrossProjectAssigneeWorkloads } from "@/app/assignee-gantt/actions";
import {
  WorkloadGanttChart,
  type WorkloadFetcher,
} from "@/components/assignee-gantt/workload-gantt-chart";

/**
 * プロジェクト横断の担当者別ガントチャート
 * 汎用の WorkloadGanttChart に横断取得関数を与える薄いコンテナ。
 */
export function CrossProjectGanttChart() {
  const fetcher = useCallback<WorkloadFetcher>(
    (startYmd, endYmd) => getCrossProjectAssigneeWorkloads(startYmd, endYmd),
    []
  );

  return (
    <WorkloadGanttChart
      fetcher={fetcher}
      title="担当者別ガントチャート（プロジェクト横断）"
    />
  );
}
