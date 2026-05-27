"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Copy,
  Play,
  CheckCircle,
  AlertTriangle,
  User,
  Calendar,
  Clock,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { TaskSchedulingResult } from "@/applications/task-scheduling/task-scheduling-application.service";
import {
  calculateTaskSchedules,
  getSchedulingAssignees,
  type SchedulingAssignee,
  type CalculateTaskSchedulesParams,
} from "./task-scheduling-actions";
import { toast } from "@/hooks/use-toast";
import type { SchedulingMode } from "@/applications/task-scheduling/task-scheduling-application.service";

interface TaskSchedulingPageProps {
  wbsId: number;
}

export function TaskSchedulingPage({ wbsId }: TaskSchedulingPageProps) {
  const [results, setResults] = useState<TaskSchedulingResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCalculated, setIsCalculated] = useState(false);

  // モード
  const [mode, setMode] = useState<SchedulingMode>("initial");

  // 担当者起点日
  const [assignees, setAssignees] = useState<SchedulingAssignee[]>([]);
  const [assigneeStartDates, setAssigneeStartDates] = useState<
    Map<number, string>
  >(new Map());
  const [showAssigneeSettings, setShowAssigneeSettings] = useState(false);

  useEffect(() => {
    getSchedulingAssignees(wbsId).then(setAssignees);
  }, [wbsId]);

  const handleAssigneeDateChange = useCallback(
    (assigneeId: number, value: string) => {
      setAssigneeStartDates((prev) => {
        const next = new Map(prev);
        if (value) {
          next.set(assigneeId, value);
        } else {
          next.delete(assigneeId);
        }
        return next;
      });
    },
    []
  );

  const handleCalculate = async () => {
    setIsLoading(true);
    try {
      const params: CalculateTaskSchedulesParams = {
        wbsId,
        mode,
      };

      if (mode === "reschedule") {
        params.rescheduleBaseDate = new Date().toISOString();
      }

      const assigneeDatesArray = Array.from(assigneeStartDates.entries())
        .filter(([, v]) => v)
        .map(([assigneeId, startDate]) => ({
          assigneeId,
          startDate: new Date(startDate).toISOString(),
        }));
      if (assigneeDatesArray.length > 0) {
        params.assigneeStartDates = assigneeDatesArray;
      }

      const calculatedResults = await calculateTaskSchedules(params);
      setResults(calculatedResults);
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
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}/${month}/${day}`;
  };

  return (
    <div className="space-y-6">
      {/* モード切替・設定 */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="flex items-center gap-4">
            <Label>モード</Label>
            <div className="flex gap-2">
              <Button
                variant={mode === "initial" ? "default" : "outline"}
                size="sm"
                onClick={() => setMode("initial")}
              >
                初期計画
              </Button>
              <Button
                variant={mode === "reschedule" ? "default" : "outline"}
                size="sm"
                onClick={() => setMode("reschedule")}
              >
                リスケ
              </Button>
            </div>
            {mode === "reschedule" && (
              <span className="text-sm text-gray-500">
                起点日: 今日（{formatDate(new Date())})
              </span>
            )}
          </div>

          {/* 担当者起点日 */}
          {assignees.length > 0 && (
            <div>
              <button
                type="button"
                className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900"
                onClick={() => setShowAssigneeSettings(!showAssigneeSettings)}
              >
                {showAssigneeSettings ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
                担当者別起点日（任意）
              </button>
              {showAssigneeSettings && (
                <div className="mt-2 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {assignees.map((assignee) => (
                    <div
                      key={assignee.id}
                      className="flex items-center gap-2"
                    >
                      <Label className="text-sm min-w-[80px] truncate">
                        {assignee.name}
                      </Label>
                      <Input
                        type="date"
                        className="h-8 text-sm"
                        value={assigneeStartDates.get(assignee.id) ?? ""}
                        onChange={(e) =>
                          handleAssigneeDateChange(assignee.id, e.target.value)
                        }
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 実行ボタン */}
      <div className="flex gap-4">
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
      </div>

      {/* 結果一覧 */}
      {isCalculated && results.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>スケジューリング結果</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {results.map((result, index) => (
                <div
                  key={index}
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
