"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EvmChart } from "./evm-chart";
import { EvmMetricsCard } from "./evm-metrics-card";
import { TaskEvmTable } from "./task-evm-table";
import { EvmTimeSeriesTable } from "./evm-timeseries-table";
import { getEvmDashboardData } from "@/app/wbs/[id]/actions/evm-actions";
import type { EvmMetricsData, TaskEvmDataSerialized } from "@/applications/evm/evm-dashboard-dto";
import { Loader2, TrendingUp, DollarSign, Info } from "lucide-react";
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
  defaultProgressMethod?: "ZERO_HUNDRED" | "FIFTY_FIFTY" | "SELF_REPORTED";
};

export function EvmDashboard({
  wbsId,
  defaultProgressMethod,
}: EvmDashboardProps) {
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
  >(defaultProgressMethod ?? "ZERO_HUNDRED");

  // 時系列間隔
  const [interval, setInterval] = useState<"daily" | "weekly" | "monthly">(
    "daily"
  );

  // 期間選択モード
  const [periodMode, setPeriodMode] = useState<
    "project" | "recent3months" | "recent1month" | "custom"
  >("project");

  // 予測表示
  const [showPrediction, setShowPrediction] = useState(true);

  useEffect(() => {
    loadEvmData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    wbsId,
    calculationMode,
    progressMethod,
    interval,
    periodMode,
    showPrediction,
  ]);

  /**
   * EVMデータを読み込む
   * 現在メトリクス・時系列・タスク別詳細・日付範囲を1リクエストでまとめて取得する。
   */
  const loadEvmData = async (): Promise<void> => {
    try {
      setIsLoading(true);
      setError(null);

      const result = await getEvmDashboardData({
        wbsId,
        calculationMode,
        progressMethod,
        interval,
        periodMode,
        showPrediction,
      });

      if (!result.success || !result.data) {
        throw new Error(result.error ?? "EVMデータのロードに失敗しました");
      }

      setCurrentMetrics(result.data.currentMetrics);
      setTimeSeriesData(result.data.timeSeries);
      setTaskDetails(result.data.taskDetails);
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
        <CardContent className="pt-3 pb-3">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5">
              <Label htmlFor="period-mode" className="text-xs whitespace-nowrap text-muted-foreground">表示期間</Label>
              <Select
                value={periodMode}
                onValueChange={(value) =>
                  setPeriodMode(
                    value as
                      | "project"
                      | "recent3months"
                      | "recent1month"
                      | "custom"
                  )
                }
              >
                <SelectTrigger id="period-mode" className="h-7 text-xs w-[130px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="project">プロジェクト全期間</SelectItem>
                  <SelectItem value="recent3months">過去3ヶ月</SelectItem>
                  <SelectItem value="recent1month">過去1ヶ月</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-1.5">
              <Label htmlFor="interval" className="text-xs whitespace-nowrap text-muted-foreground">間隔</Label>
              <Select
                value={interval}
                onValueChange={(value) =>
                  setInterval(value as "daily" | "weekly" | "monthly")
                }
              >
                <SelectTrigger id="interval" className="h-7 text-xs w-[80px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">日次</SelectItem>
                  <SelectItem value="weekly">週次</SelectItem>
                  <SelectItem value="monthly">月次</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-1.5">
              <Label htmlFor="calculation-mode" className="text-xs whitespace-nowrap text-muted-foreground">算出方式</Label>
              <Select
                value={calculationMode}
                onValueChange={(value) =>
                  setCalculationMode(value as "hours" | "cost")
                }
              >
                <SelectTrigger id="calculation-mode" className="h-7 text-xs w-[100px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hours">
                    <div className="flex items-center gap-1.5">
                      <TrendingUp className="h-3 w-3" />
                      工数ベース
                    </div>
                  </SelectItem>
                  <SelectItem value="cost">
                    <div className="flex items-center gap-1.5">
                      <DollarSign className="h-3 w-3" />
                      金額ベース
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-1.5">
              <Label htmlFor="progress-method" className="text-xs whitespace-nowrap text-muted-foreground">進捗率測定</Label>
              <Select
                value={progressMethod}
                onValueChange={(value) =>
                  setProgressMethod(
                    value as "ZERO_HUNDRED" | "FIFTY_FIFTY" | "SELF_REPORTED"
                  )
                }
              >
                <SelectTrigger id="progress-method" className="h-7 text-xs w-[120px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ZERO_HUNDRED">0/100法</SelectItem>
                  <SelectItem value="FIFTY_FIFTY">50/50法</SelectItem>
                  <SelectItem value="SELF_REPORTED">自己申告進捗率</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-1.5 ml-auto">
              <Switch
                id="show-prediction"
                checked={showPrediction}
                onCheckedChange={setShowPrediction}
                className="scale-75"
              />
              <Label htmlFor="show-prediction" className="text-xs whitespace-nowrap">予測線</Label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-3.5 w-3.5 text-muted-foreground cursor-pointer" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-[350px] p-4">
                    <div className="space-y-3">
                      <p className="font-semibold">予測値の算出について</p>
                      <p className="text-sm">
                        現在のパフォーマンス効率（CPIおよびSPI）が、今後も継続すると仮定して算出しています。
                      </p>
                      <div className="text-xs text-muted-foreground space-y-1.5 bg-muted p-2 rounded">
                        <p>
                          <span className="font-medium">予測EV (出来高)</span>{" "}
                          = <br />
                          現在EV + (将来PV - 現在PV) × SPI
                        </p>
                        <p>
                          <span className="font-medium">予測AC (実コスト)</span>{" "}
                          = <br />
                          現在AC + (予測EV増加分) / CPI
                        </p>
                        <p className="pt-1 border-t border-border mt-1">
                          ※EVはBAC（完了時予算）を上限とします
                        </p>
                      </div>
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* タブ */}
      <Tabs defaultValue="chart" className="space-y-4">
        <TabsList>
          <TabsTrigger value="chart">トレンドチャート</TabsTrigger>
          <TabsTrigger value="timeseries">時系列データ</TabsTrigger>
          <TabsTrigger value="tasks">タスク別詳細</TabsTrigger>
        </TabsList>

        <TabsContent value="chart">
          <EvmChart data={timeSeriesData} calculationMode={calculationMode} />
        </TabsContent>

        <TabsContent value="timeseries">
          <EvmTimeSeriesTable
            data={timeSeriesData}
            calculationMode={calculationMode}
          />
        </TabsContent>

        <TabsContent value="tasks">
          <TaskEvmTable
            tasks={taskDetails}
            calculationMode={calculationMode}
            progressMethod={progressMethod}
          />
        </TabsContent>
      </Tabs>

      {/* メトリクスカード */}
      <EvmMetricsCard metrics={currentMetrics} />
    </div>
  );
}
