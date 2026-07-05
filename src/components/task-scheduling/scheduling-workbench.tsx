"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Play, Download, AlertTriangle, Calendar } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { calculateSchedule } from "./scheduling-actions";
import type { ScheduleCalculationResult } from "@/applications/task-scheduling/ischeduling-application-service";
import type { BaselineMode } from "@/types/scheduling-settings";
import {
  scheduledToGanttTasks,
  scheduledToGanttPhases,
} from "./adapters/scheduled-to-gantt";
import { SchedulingGanttPreview } from "./scheduling-gantt-preview";
import { AssigneeGanttChart } from "@/app/wbs/[id]/assignee-gantt/assignee-gantt-chart";

interface SchedulingWorkbenchProps {
  wbsId: number;
}

const WARNING_LABELS: Record<string, string> = {
  NO_ASSIGNEE: "担当者未設定",
  NO_YOTEI_KOSU: "予定工数未設定",
  CYCLIC_DEPENDENCY: "循環依存",
  STEADY_NO_PERIOD: "定常タスク期間未設定",
  ON_HOLD: "保留タスク",
  COMPLETED_NO_PERIOD: "完了タスク日程なし",
  EXCEEDS_PROJECT_END: "プロジェクト終了日超過",
};

// <input type="date"> の "YYYY-MM-DD" をその日のUTC 0時の ISO に正規化（CLAUDE.md ポリシー）
function dateInputToUtcIso(local: string): string {
  return new Date(`${local}T00:00:00.000Z`).toISOString();
}

export function SchedulingWorkbench({ wbsId }: SchedulingWorkbenchProps) {
  const [baselineMode, setBaselineMode] =
    useState<BaselineMode>("PROJECT_START");
  const [customDate, setCustomDate] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<ScheduleCalculationResult | null>(null);

  const handleCalculate = async () => {
    setIsLoading(true);
    setResult(null);
    try {
      const res = await calculateSchedule(wbsId, {
        baselineMode,
        baselineDateIso:
          baselineMode === "CUSTOM" && customDate
            ? dateInputToUtcIso(customDate)
            : undefined,
      });
      setResult(res);
    } catch (error) {
      toast({
        title: "スケジュール計算エラー",
        description: error instanceof Error ? error.message : String(error),
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownloadTsv = () => {
    if (!result) return;
    const bom = "﻿";
    const blob = new Blob([bom + result.tsv], {
      type: "text/tab-separated-values;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `schedule_wbs${wbsId}.tsv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const ganttTasks = result ? scheduledToGanttTasks(result.scheduledTasks) : [];
  const ganttPhases = result
    ? scheduledToGanttPhases(result.scheduledTasks)
    : [];
  const baseDate = result ? new Date(result.baselineDate) : undefined;

  const summary = result
    ? {
        scheduled: result.scheduledTasks.filter((t) => !t.skipped).length,
        skipped: result.scheduledTasks.filter((t) => t.skipped).length,
      }
    : null;

  return (
    <div className="space-y-6">
      {/* コントロールバー */}
      <div className="flex flex-wrap items-end gap-4">
        <div className="flex flex-col gap-1">
          <label className="text-sm text-gray-600">基準日</label>
          <Select
            value={baselineMode}
            onValueChange={(v) => setBaselineMode(v as BaselineMode)}
          >
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="PROJECT_START">プロジェクト開始日</SelectItem>
              <SelectItem value="TODAY">今日</SelectItem>
              <SelectItem value="CUSTOM">任意の日付</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {baselineMode === "CUSTOM" && (
          <div className="flex flex-col gap-1">
            <label className="text-sm text-gray-600">日付</label>
            <input
              type="date"
              value={customDate}
              onChange={(e) => setCustomDate(e.target.value)}
              className="border rounded px-2 py-1 text-sm h-9"
            />
          </div>
        )}
        <Button
          onClick={handleCalculate}
          disabled={isLoading}
          className="flex items-center gap-2"
        >
          <Play className="h-4 w-4" />
          {isLoading ? "計算中..." : "スケジュール計算"}
        </Button>
        {result && (
          <Button
            onClick={handleDownloadTsv}
            variant="outline"
            className="flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            TSVダウンロード
          </Button>
        )}
      </div>

      {/* 前提警告 */}
      {result && result.warnings.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              前提条件の警告 ({result.warnings.length}件)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1 text-sm">
              {result.warnings.map((w, i) => (
                <li key={i} className="flex items-center gap-2 flex-wrap">
                  <Badge variant="secondary">
                    {WARNING_LABELS[w.kind] ?? w.kind}
                  </Badge>
                  <span>
                    {w.cycleTaskNos
                      ? `タスク: ${w.cycleTaskNos.join(", ")}`
                      : `${w.taskNo ?? ""} ${w.taskName ?? ""}`}
                  </span>
                  {w.detail && (
                    <span className="text-gray-500 text-xs">{w.detail}</span>
                  )}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* サマリー */}
      {summary && (
        <div className="flex gap-2">
          <Badge variant="default">計算対象 {summary.scheduled}件</Badge>
          {summary.skipped > 0 && (
            <Badge variant="secondary">除外 {summary.skipped}件</Badge>
          )}
        </div>
      )}

      {/* 結果ガント */}
      {result && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              スケジュール（ガント）
            </CardTitle>
          </CardHeader>
          <CardContent>
            <SchedulingGanttPreview tasks={ganttTasks} categories={ganttPhases} />
          </CardContent>
        </Card>
      )}

      {/* 担当者別負荷（AssigneeGanttChart を計算結果プレビューとして利用） */}
      {result && result.workloads.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-base font-medium">担当者別負荷</h3>
          <AssigneeGanttChart
            wbsId={wbsId}
            previewWorkloads={result.workloads}
            previewBaseDate={baseDate}
          />
        </div>
      )}
    </div>
  );
}
