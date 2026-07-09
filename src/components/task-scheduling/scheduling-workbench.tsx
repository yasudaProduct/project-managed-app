"use client";

import { useEffect, useRef, useState } from "react";
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
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Play,
  Download,
  AlertTriangle,
  Calendar,
  RotateCcw,
  Loader2,
  Info,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import {
  calculateSchedule,
  recalculateSchedulePreview,
} from "./scheduling-actions";
import type {
  ScheduleCalculationResult,
  SchedulePreviewRecalcResult,
  ScheduledTaskDto,
} from "@/applications/task-scheduling/ischeduling-application-service";
import type { BaselineMode } from "@/types/scheduling-settings";
import type { Task as GanttTask } from "@/components/ganttv3/gantt";
import {
  scheduledToGanttTasks,
  scheduledToGanttPhases,
  applyGanttTaskToScheduled,
  scheduledToAssigneeOptions,
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

/** 手動調整のデバウンス間隔（連続編集中の負荷再計算を抑える） */
const RECALC_DEBOUNCE_MS = 500;

// <input type="date"> の "YYYY-MM-DD" をその日のUTC 0時の ISO に正規化（CLAUDE.md ポリシー）
function dateInputToUtcIso(local: string): string {
  return new Date(`${local}T00:00:00.000Z`).toISOString();
}

/** 手動調整の巻き戻し用スナップショット */
interface AdjustmentSnapshot {
  edited: ScheduledTaskDto[] | null;
  overlay: SchedulePreviewRecalcResult | null;
  editedIds: Set<number>;
}

export function SchedulingWorkbench({ wbsId }: SchedulingWorkbenchProps) {
  const [baselineMode, setBaselineMode] =
    useState<BaselineMode>("PROJECT_START");
  const [customDate, setCustomDate] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<ScheduleCalculationResult | null>(null);

  // --- 手動調整（画面上のみ。DBへは書き込まない） ---
  // 調整後のスケジュール。null = 未調整（計算結果をそのまま表示）
  const [edited, setEdited] = useState<ScheduledTaskDto[] | null>(null);
  // 調整後スケジュールから再計算した負荷・TSV・超過警告
  const [overlay, setOverlay] = useState<SchedulePreviewRecalcResult | null>(
    null
  );
  const [editedIds, setEditedIds] = useState<Set<number>>(new Set());
  const [isAdjusting, setIsAdjusting] = useState(false);
  const [isRecalcing, setIsRecalcing] = useState(false);
  // 調整モードに入った時点の状態（キャンセルで巻き戻す）
  const snapshotRef = useRef<AdjustmentSnapshot | null>(null);
  // 古い再計算レスポンスを無視するためのシーケンス
  const recalcSeqRef = useRef(0);

  const resetAdjustment = () => {
    recalcSeqRef.current++;
    setEdited(null);
    setOverlay(null);
    setEditedIds(new Set());
    setIsAdjusting(false);
    setIsRecalcing(false);
    snapshotRef.current = null;
  };

  const handleCalculate = async () => {
    setIsLoading(true);
    setResult(null);
    resetAdjustment();
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

  // 調整後の表示値（未調整なら元の計算結果）
  const displayTasks = edited ?? result?.scheduledTasks ?? [];
  const displayWorkloads = overlay?.workloads ?? result?.workloads ?? [];
  const displayTsv = overlay?.tsv ?? result?.tsv ?? "";
  const displayWarnings = result
    ? overlay
      ? [
          ...result.warnings.filter((w) => w.kind !== "EXCEEDS_PROJECT_END"),
          ...overlay.warnings,
        ]
      : result.warnings
    : [];

  // ガント上の編集（ドラッグ・インライン編集）をクライアント状態へ反映
  const handleGanttTaskUpdate = (task: GanttTask) => {
    if (!result || task.dbId == null) return;
    const target = displayTasks.find((d) => d.taskId === task.dbId);
    if (!target) return;
    if (target.fixed) {
      toast({
        title: "調整できません",
        description: "完了（実績固定）タスクは手動調整の対象外です。",
      });
      return;
    }
    setEdited((prev) =>
      applyGanttTaskToScheduled(prev ?? result.scheduledTasks, task)
    );
    setEditedIds((prev) => new Set(prev).add(task.dbId!));
  };

  // 調整内容から負荷・TSV・超過警告をデバウンス付きで再計算（読み取り専用の server action）
  useEffect(() => {
    if (!edited || !result) return;
    const seq = ++recalcSeqRef.current;
    const timer = setTimeout(async () => {
      setIsRecalcing(true);
      try {
        const res = await recalculateSchedulePreview(wbsId, {
          baselineDateIso: result.baselineDate,
          scheduledTasks: edited,
        });
        if (seq === recalcSeqRef.current) setOverlay(res);
      } catch (error) {
        if (seq === recalcSeqRef.current) {
          toast({
            title: "負荷の再計算エラー",
            description:
              error instanceof Error ? error.message : String(error),
            variant: "destructive",
          });
        }
      } finally {
        if (seq === recalcSeqRef.current) setIsRecalcing(false);
      }
    }, RECALC_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [edited, result, wbsId]);

  const handleEnterAdjust = () => {
    snapshotRef.current = { edited, overlay, editedIds };
    setIsAdjusting(true);
  };

  const handleSaveAdjust = () => {
    // 「保存」= 画面上の調整を確定して調整モードを抜けるだけ（DBへは書き込まない）
    snapshotRef.current = null;
    setIsAdjusting(false);
  };

  const handleCancelAdjust = () => {
    const snap = snapshotRef.current;
    recalcSeqRef.current++;
    setIsRecalcing(false);
    if (snap) {
      setEdited(snap.edited);
      setOverlay(snap.overlay);
      setEditedIds(snap.editedIds);
    }
    snapshotRef.current = null;
    setIsAdjusting(false);
  };

  const handleDownloadTsv = () => {
    if (!result) return;
    const bom = "﻿";
    const blob = new Blob([bom + displayTsv], {
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

  const ganttTasks = scheduledToGanttTasks(displayTasks);
  const ganttPhases = scheduledToGanttPhases(displayTasks);
  const assigneeOptions = result
    ? scheduledToAssigneeOptions(result.scheduledTasks)
    : [];
  const baseDate = result ? new Date(result.baselineDate) : undefined;

  const summary = result
    ? {
        scheduled: displayTasks.filter((t) => !t.skipped).length,
        skipped: displayTasks.filter((t) => t.skipped).length,
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
            disabled={isRecalcing}
            className="flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            TSVダウンロード
          </Button>
        )}
      </div>

      {/* 機能説明 */}
      <Accordion type="single" collapsible className="rounded-lg border px-4">
        <AccordionItem value="about" className="border-none">
          <AccordionTrigger className="py-3 text-sm font-medium hover:no-underline">
            <span className="flex items-center gap-2">
              <Info className="h-4 w-4 text-muted-foreground" />
              この機能について（用途・注意事項）
            </span>
          </AccordionTrigger>
          <AccordionContent>
            <div className="space-y-3 text-sm text-gray-600">
              <div>
                <p className="font-medium text-gray-800">用途・使い方</p>
                <ul className="list-disc space-y-0.5 pl-5">
                  <li>
                    プロジェクト開始時に、タスクの依存関係や担当者の稼働予定を踏まえた予定日程を自動で試算します（基準日「プロジェクト開始日」）。
                  </li>
                  <li>
                    プロジェクト途中のリスケジュールにも使えます（基準日「今日」または「任意の日付」）。完了タスクは実績日程のまま固定され、未着手・進行中タスクのみ基準日以降に再配置されます。
                  </li>
                  <li>
                    計算結果は画面プレビューとTSV出力のみです。WBSのタスク日程に自動反映はされません。実際の予定に反映する場合はTSVをダウンロードし、MySQL/Excelインポート機能で取り込んでください。
                  </li>
                  <li>
                    「編集モード」に入るとガント上で計算結果をドラッグ・微調整できますが、この調整も画面上のみでDBには保存されません。
                  </li>
                </ul>
              </div>
              <div>
                <p className="font-medium text-gray-800">
                  注意事項（警告・計算対象外になるケース）
                </p>
                <ul className="list-disc space-y-0.5 pl-5">
                  <li>
                    担当者未設定・予定工数未設定のタスクは計算対象外（スキップ）になります。
                  </li>
                  <li>
                    定常タスク（タスク名が設定キーワードに一致するもの）は前詰めせず既存の期間のまま据え置かれます。期間が未設定だと計算対象外になります。
                  </li>
                  <li>
                    タスクの依存関係が循環している場合、該当タスクは計算から除外されます。
                  </li>
                  <li>
                    保留タスクは警告付きで計算対象に含まれます（未着手タスクと同様に扱われます）。
                  </li>
                  <li>
                    完了タスクに実績・予定のいずれの日程もない場合、日程未確定のまま固定され、後続タスクの依存関係には反映されません。
                  </li>
                  <li>
                    計算後、予定終了日がプロジェクト終了日を超えるタスクがあると警告が表示されます（計算自体がエラーになるわけではありません）。
                  </li>
                  <li>
                    基準日に「任意の日付」を選んだ場合、日付を入力せずに計算するとエラーになります。
                  </li>
                </ul>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      {/* 前提警告 */}
      {result && displayWarnings.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              前提条件の警告 ({displayWarnings.length}件)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1 text-sm">
              {displayWarnings.map((w, i) => (
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
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="default">計算対象 {summary.scheduled}件</Badge>
          {summary.skipped > 0 && (
            <Badge variant="secondary">除外 {summary.skipped}件</Badge>
          )}
          {editedIds.size > 0 && (
            <>
              <Badge variant="outline" className="border-blue-400 text-blue-600">
                手動調整 {editedIds.size}件（画面上のみ・DB未保存）
              </Badge>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 gap-1 text-xs text-gray-600"
                onClick={resetAdjustment}
              >
                <RotateCcw className="h-3 w-3" />
                調整を破棄して計算結果に戻す
              </Button>
            </>
          )}
          {isRecalcing && (
            <span className="flex items-center gap-1 text-xs text-gray-500">
              <Loader2 className="h-3 w-3 animate-spin" />
              負荷を再計算中...
            </span>
          )}
        </div>
      )}

      {/* 結果ガント（調整モードでドラッグ・インライン編集可能） */}
      {result && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              スケジュール（ガント）
              {isAdjusting && (
                <span className="text-xs font-normal text-blue-600">
                  調整モード: バーのドラッグ／クリックで編集できます（DBには保存されません）
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <SchedulingGanttPreview
              tasks={ganttTasks}
              categories={ganttPhases}
              editMode={isAdjusting}
              assignees={assigneeOptions}
              onTaskUpdate={handleGanttTaskUpdate}
              onEnterEditMode={handleEnterAdjust}
              onSaveEdit={handleSaveAdjust}
              onCancelEdit={handleCancelAdjust}
            />
          </CardContent>
        </Card>
      )}

      {/* 担当者別負荷（AssigneeGanttChart を計算結果プレビューとして利用） */}
      {result && displayWorkloads.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-base font-medium">担当者別負荷</h3>
          <AssigneeGanttChart
            wbsId={wbsId}
            previewWorkloads={displayWorkloads}
            previewBaseDate={baseDate}
          />
        </div>
      )}
    </div>
  );
}
