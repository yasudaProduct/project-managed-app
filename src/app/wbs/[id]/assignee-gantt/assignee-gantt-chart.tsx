"use client";

import { useCallback, useState } from "react";
import { getAssigneeWorkloads } from "@/app/wbs/[id]/assignee-gantt/assignee-gantt-actions";
import {
  WorkloadGanttChart,
  type WorkloadFetcher,
} from "@/components/assignee-gantt/workload-gantt-chart";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
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
 * 「他WBSの負荷を考慮」トグルで、未開始・進行中プロジェクトの最新WBSの負荷を合算表示できる。
 */
export function AssigneeGanttChart({
  wbsId,
  previewWorkloads,
  previewWarnings,
  previewBaseDate,
}: AssigneeGanttChartProps) {
  const isPreview = !!previewWorkloads;
  const [includeOtherWbs, setIncludeOtherWbs] = useState(false);

  // fetcherのidentity変化(トグル切替)で汎用チャート側が自動的に再取得する
  const fetcher = useCallback<WorkloadFetcher>(
    (startYmd, endYmd) =>
      getAssigneeWorkloads(wbsId, startYmd, endYmd, { includeOtherWbs }),
    [wbsId, includeOtherWbs]
  );

  return (
    <WorkloadGanttChart
      fetcher={isPreview ? undefined : fetcher}
      previewWorkloads={previewWorkloads}
      previewWarnings={previewWarnings}
      previewBaseDate={previewBaseDate}
      headerExtra={
        isPreview ? undefined : (
          <div className="flex items-center gap-2 mr-2">
            <Switch
              id="include-other-wbs"
              checked={includeOtherWbs}
              onCheckedChange={setIncludeOtherWbs}
            />
            <Label
              htmlFor="include-other-wbs"
              className="text-sm whitespace-nowrap cursor-pointer"
            >
              他WBSの負荷を考慮
            </Label>
          </div>
        )
      }
    />
  );
}
