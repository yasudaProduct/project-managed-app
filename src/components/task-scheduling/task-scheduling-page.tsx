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
import {
  Copy,
  Play,
  CheckCircle,
  AlertTriangle,
  User,
  Calendar,
  Clock,
  BarChart3,
  List,
} from "lucide-react";
import { TaskSchedulingResult } from "@/applications/task-scheduling/task-scheduling-application.service";
import {
  calculateTaskSchedulesWithDeps,
  AnchorMode,
} from "./task-scheduling-actions";
import { SchedulingGanttView } from "./scheduling-gantt-view";
import { Task, GanttPhase } from "@/components/ganttv3/gantt";
import { toast } from "@/hooks/use-toast";

interface TaskSchedulingPageProps {
  wbsId: number;
}

// 今日の日付を YYYY-MM-DD（ローカル）で返す
const todayStr = (): string => {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
};

export function TaskSchedulingPage({ wbsId }: TaskSchedulingPageProps) {
  const [results, setResults] = useState<TaskSchedulingResult[]>([]);
  const [ganttTasks, setGanttTasks] = useState<Task[]>([]);
  const [phases, setPhases] = useState<GanttPhase[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCalculated, setIsCalculated] = useState(false);

  // アンカー日（前詰めの起点）
  const [anchorMode, setAnchorMode] = useState<AnchorMode>("projectStart");
  const [customDate, setCustomDate] = useState<string>(todayStr());

  // 表示モード
  const [viewMode, setViewMode] = useState<"gantt" | "list">("gantt");

  const handleCalculate = async () => {
    setIsLoading(true);
    try {
      const data = await calculateTaskSchedulesWithDeps(
        wbsId,
        anchorMode,
        anchorMode === "custom" ? customDate : undefined,
      );
      setResults(data.results);
      setGanttTasks(data.ganttTasks);
      setPhases(data.phases);
      setIsCalculated(true);
    } catch (error) {
      toast({
        title: "スケジュール計算エラー",
        description: "error: \n" + error,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyTsv = () => {
    if (results.length === 0) return;

    const headers = [
      "タスクNo",
      "タスク名",
      "担当者",
      "予定開始日",
      "予定終了日",
      "予定工数",
      "エラー",
    ];

    const rows = results.map((result) => [
      result.taskNo,
      result.taskName,
      result.assigneeName || "",
      result.plannedStartDate ? formatDate(result.plannedStartDate) : "",
      result.plannedEndDate ? formatDate(result.plannedEndDate) : "",
      result.plannedManHours?.toString() || "",
      result.errorMessage || "",
    ]);

    const tsvContent = [headers, ...rows]
      .map((row) => row.join("\t"))
      .join("\n");

    // document.execCommand('copy')は非推奨だが、HTTP環境ではnavigator.clipboard APIが利用できないため使用
    const textarea = document.createElement("textarea");
    textarea.value = tsvContent;
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand("copy");
    document.body.removeChild(textarea);
    toast({
      title: "TSVデータをクリップボードにコピーしました",
    });
  };

  const formatDate = (date: Date): string => {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}/${month}/${day}`;
  };

  // エラー/未スケジュールのタスク
  const errorResults = results.filter((r) => r.errorMessage);
  const scheduledCount = results.length - errorResults.length;

  return (
    <div className="space-y-6">
      {/* 操作バー */}
      <div className="flex flex-wrap items-end gap-4">
        {/* アンカー日 */}
        <div className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground">計算の起点</span>
          <div className="flex items-center gap-2">
            <Select
              value={anchorMode}
              onValueChange={(v: AnchorMode) => setAnchorMode(v)}
            >
              <SelectTrigger className="w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="projectStart">プロジェクト開始日</SelectItem>
                <SelectItem value="today">今日</SelectItem>
                <SelectItem value="custom">任意の日付</SelectItem>
              </SelectContent>
            </Select>
            {anchorMode === "custom" && (
              <input
                type="date"
                value={customDate}
                onChange={(e) => setCustomDate(e.target.value)}
                className="h-9 rounded-md border bg-background px-2 text-sm"
              />
            )}
          </div>
        </div>

        <Button
          onClick={handleCalculate}
          disabled={isLoading}
          className="flex items-center gap-2"
        >
          <Play className="h-4 w-4" />
          {isLoading ? "計算中..." : "スケジュール計算"}
        </Button>

        {isCalculated && results.length > 0 && (
          <Button
            onClick={handleCopyTsv}
            variant="outline"
            className="flex items-center gap-2"
          >
            <Copy className="h-4 w-4" />
            TSVコピー
          </Button>
        )}

        {/* 表示切替 */}
        {isCalculated && (
          <div className="ml-auto flex rounded-md border overflow-hidden">
            <button
              onClick={() => setViewMode("gantt")}
              className={`flex items-center gap-1 px-3 py-2 text-sm transition-colors ${
                viewMode === "gantt"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted hover:bg-muted/80"
              }`}
            >
              <BarChart3 className="h-4 w-4" />
              ガント
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`flex items-center gap-1 px-3 py-2 text-sm transition-colors ${
                viewMode === "list"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted hover:bg-muted/80"
              }`}
            >
              <List className="h-4 w-4" />
              リスト
            </button>
          </div>
        )}
      </div>

      {/* 集計サマリー */}
      {isCalculated && (
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <Badge variant="default" className="flex items-center gap-1">
            <CheckCircle className="h-3 w-3" />
            算出 {scheduledCount} 件
          </Badge>
          {errorResults.length > 0 && (
            <Badge variant="destructive" className="flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" />
              未算出/エラー {errorResults.length} 件
            </Badge>
          )}
        </div>
      )}

      {/* エラー/未スケジュール一覧（常時表示） */}
      {isCalculated && errorResults.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              未算出・エラーのタスク
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {errorResults.map((result) => (
                <div
                  key={result.taskId}
                  className="flex items-center gap-2 text-sm"
                >
                  <span className="font-mono text-xs text-muted-foreground">
                    {result.taskNo}
                  </span>
                  <span className="font-medium truncate">
                    {result.taskName}
                  </span>
                  <span className="text-destructive text-xs">
                    {result.errorMessage}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* メイン表示（ガント / リスト） */}
      {isCalculated && viewMode === "gantt" && ganttTasks.length > 0 && (
        <div className="h-[70vh] rounded-lg border overflow-hidden">
          <SchedulingGanttView tasks={ganttTasks} categories={phases} />
        </div>
      )}

      {isCalculated && viewMode === "gantt" && ganttTasks.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            ガントに表示できる算出済みタスクがありません。
          </CardContent>
        </Card>
      )}

      {isCalculated && viewMode === "list" && results.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>スケジューリング結果</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {results.map((result) => (
                <div
                  key={result.taskId}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono text-sm text-gray-600">
                        {result.taskNo}
                      </span>
                      <span className="font-medium truncate">
                        {result.taskName}
                      </span>
                      {!result.hasAssignee ? (
                        <Badge
                          variant="secondary"
                          className="flex items-center gap-1"
                        >
                          <User className="h-3 w-3" />
                          担当者未設定
                        </Badge>
                      ) : result.errorMessage ? (
                        <Badge
                          variant="destructive"
                          className="flex items-center gap-1"
                        >
                          <AlertTriangle className="h-3 w-3" />
                          エラー
                        </Badge>
                      ) : (
                        <Badge
                          variant="default"
                          className="flex items-center gap-1"
                        >
                          <CheckCircle className="h-3 w-3" />
                          正常
                        </Badge>
                      )}
                    </div>

                    <div className="flex items-center gap-4 text-sm text-gray-600 flex-wrap">
                      {result.assigneeName && (
                        <div className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          担当者: {result.assigneeName}
                        </div>
                      )}

                      {result.plannedStartDate && result.plannedEndDate && (
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          期間: {formatDate(result.plannedStartDate)} ～{" "}
                          {formatDate(result.plannedEndDate)}
                        </div>
                      )}

                      {result.plannedManHours && (
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          工数: {result.plannedManHours}時間
                        </div>
                      )}

                      {result.errorMessage && (
                        <div className="text-red-600 text-xs">
                          {result.errorMessage}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
