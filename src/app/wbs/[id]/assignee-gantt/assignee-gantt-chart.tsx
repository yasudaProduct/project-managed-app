"use client";

import { useCallback } from "react";
import { getAssigneeWorkloads } from "@/app/wbs/[id]/assignee-gantt/assignee-gantt-actions";
import {
  WorkloadGanttChart,
  type WorkloadFetcher,
} from "@/components/assignee-gantt/workload-gantt-chart";
import type {
  WorkloadData,
  AssigneeWarningData,
} from "@/applications/assignee-gantt/workload-data";

interface AssigneeGanttChartProps {
  wbsId: number;
  /** 指定時はサーバー取得せず、この計算結果プレビューを表示する */
  previewWorkloads?: WorkloadData[];
  previewWarnings?: AssigneeWarningData[];
  previewBaseDate?: Date;
}

/**
 * 担当者別ガントチャート(WBS単位)
 * 汎用の WorkloadGanttChart に現WBSの取得関数を与える薄いコンテナ。
 */
export function AssigneeGanttChart({
  wbsId,
  previewWorkloads,
  previewWarnings,
  previewBaseDate,
}: AssigneeGanttChartProps) {
  const isPreview = !!previewWorkloads;

  const fetcher = useCallback<WorkloadFetcher>(
    (startYmd, endYmd) => getAssigneeWorkloads(wbsId, startYmd, endYmd),
    [wbsId]
  );

  return (
    <WorkloadGanttChart
      fetcher={isPreview ? undefined : fetcher}
      previewWorkloads={previewWorkloads}
      previewWarnings={previewWarnings}
      previewBaseDate={previewBaseDate}
    />
  );
}
