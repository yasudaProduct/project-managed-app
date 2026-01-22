"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Copy,
  Play,
  CheckCircle,
  AlertTriangle,
  User,
  Calendar,
  Clock,
} from "lucide-react";
import { TaskSchedulingResult } from "@/applications/task-scheduling/task-scheduling-application.service";
import { calculateTaskSchedules } from "./task-scheduling-actions";
import { toast } from "@/hooks/use-toast";

interface TaskSchedulingPageProps {
  wbsId: number;
}

export function TaskSchedulingPage({ wbsId }: TaskSchedulingPageProps) {
  const [results, setResults] = useState<TaskSchedulingResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCalculated, setIsCalculated] = useState(false);

  const handleCalculate = async () => {
    setIsLoading(true);
    try {
      const calculatedResults = await calculateTaskSchedules(wbsId);
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

    navigator.clipboard.writeText(tsvContent).then(() => {
      toast({
        title: "TSVデータをクリップボードにコピーしました",
      });
    });
  };

  const formatDate = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}/${month}/${day}`;
  };

  const successCount = results.filter(
    (r) => r.hasAssignee && !r.errorMessage
  ).length;
  const errorCount = results.filter((r) => r.errorMessage).length;
  const noAssigneeCount = results.filter((r) => !r.hasAssignee).length;

  return (
    <div className="space-y-6">
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

      {/* 結果サマリー */}
      {isCalculated && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">総タスク数</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{results.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-green-600">
                正常計算
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {successCount}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-red-600">
                エラー
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {errorCount}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                担当者未設定
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-600">
                {noAssigneeCount}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

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

                    <div className="text-sm text-gray-600 space-y-1">
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
