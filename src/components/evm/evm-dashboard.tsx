"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EvmChart } from "./evm-chart";
import { EvmMetricsCard } from "./evm-metrics-card";
import { TaskEvmTable } from "./task-evm-table";
import {
  getCurrentEvmMetrics,
  getEvmTimeSeries,
  getTaskEvmDetails,
  type EvmMetricsData,
  type TaskEvmDataSerialized,
} from "@/app/actions/evm/evm-actions";
import { Loader2, TrendingUp, DollarSign } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type EvmDashboardProps = {
  wbsId: number;
};

export function EvmDashboard({ wbsId }: EvmDashboardProps) {
  const [currentMetrics, setCurrentMetrics] = useState<EvmMetricsData | null>(
    null
  );
  const [timeSeriesData, setTimeSeriesData] = useState<EvmMetricsData[]>([]);
  const [taskDetails, setTaskDetails] = useState<TaskEvmDataSerialized[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // EVM設定
  const [calculationMode, setCalculationMode] = useState<"hours" | "cost">(
    "hours"
  );

  // 進捗率測定方法
  const [progressMethod, setProgressMethod] = useState<
    "ZERO_HUNDRED" | "FIFTY_FIFTY" | "SELF_REPORTED"
  >("SELF_REPORTED");

  // 時系列間隔
  const [interval, setInterval] = useState<"daily" | "weekly" | "monthly">(
    "weekly"
  );

  useEffect(() => {
    loadEvmData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wbsId, calculationMode, progressMethod, interval]);

  /**
   * EVMデータを読み込む
   */
  const loadEvmData = async (): Promise<void> => {
    try {
      setIsLoading(true);
      setError(null);

      // 現在のメトリクスを取得
      const metricsResult = await getCurrentEvmMetrics({
        wbsId,
        calculationMode,
        progressMethod,
      });

      if (!metricsResult.success || !metricsResult.data) {
        throw new Error(
          metricsResult.error ?? "メトリクスのロードに失敗しました"
        );
      }

      setCurrentMetrics(metricsResult.data);

      // 時系列データを取得（過去3ヶ月）
      const endDate = new Date();
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - 3); // 過去3ヶ月

      const timeSeriesResult = await getEvmTimeSeries({
        wbsId,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        interval,
        calculationMode,
        progressMethod,
      });

      if (!timeSeriesResult.success || !timeSeriesResult.data) {
        throw new Error(
          timeSeriesResult.error ?? "時系列データをロードできませんでした"
        );
      }

      setTimeSeriesData(timeSeriesResult.data);

      // タスク別データを取得
      const taskResult = await getTaskEvmDetails({ wbsId });

      if (!taskResult.success || !taskResult.data) {
        throw new Error(
          taskResult.error ?? "タスクの詳細をロードできませんでした"
        );
      }
      setTaskDetails(taskResult.data);
    } catch (err) {
      console.error("Failed to load EVM data:", err);
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>
          {error}
          <Button onClick={loadEvmData} variant="outline" className="ml-4">
            再試行
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  if (!currentMetrics) {
    return (
      <Alert>
        <AlertDescription>EVMデータがありません。</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* コントロール */}
      <Card>
        <CardHeader>
          <CardTitle>EVM設定</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="calculation-mode">算出方式</Label>
              <Select
                value={calculationMode}
                onValueChange={(value) =>
                  setCalculationMode(value as "hours" | "cost")
                }
              >
                <SelectTrigger id="calculation-mode">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hours">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4" />
                      工数ベース
                    </div>
                  </SelectItem>
                  <SelectItem value="cost">
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4" />
                      金額ベース
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="progress-method">進捗率測定方法</Label>
              <Select
                value={progressMethod}
                onValueChange={(value) =>
                  setProgressMethod(
                    value as "ZERO_HUNDRED" | "FIFTY_FIFTY" | "SELF_REPORTED"
                  )
                }
              >
                <SelectTrigger id="progress-method">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ZERO_HUNDRED">0/100法</SelectItem>
                  <SelectItem value="FIFTY_FIFTY">50/50法</SelectItem>
                  <SelectItem value="SELF_REPORTED">自己申告進捗率</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="interval">時系列間隔</Label>
              <Select
                value={interval}
                onValueChange={(value) =>
                  setInterval(value as "daily" | "weekly" | "monthly")
                }
              >
                <SelectTrigger id="interval">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">日次</SelectItem>
                  <SelectItem value="weekly">週次</SelectItem>
                  <SelectItem value="monthly">月次</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* メトリクスカード */}
      <EvmMetricsCard metrics={currentMetrics} />

      {/* タブ */}
      <Tabs defaultValue="chart" className="space-y-4">
        <TabsList>
          <TabsTrigger value="chart">トレンドチャート</TabsTrigger>
          <TabsTrigger value="tasks">タスク別詳細</TabsTrigger>
        </TabsList>

        <TabsContent value="chart">
          <EvmChart data={timeSeriesData} calculationMode={calculationMode} />
        </TabsContent>

        <TabsContent value="tasks">
          <TaskEvmTable tasks={taskDetails} calculationMode={calculationMode} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
