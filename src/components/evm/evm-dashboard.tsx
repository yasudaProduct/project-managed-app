"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
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
import { EvmBreakdownTable } from "./evm-breakdown-table";
import { getEvmDashboardData } from "@/app/wbs/[id]/actions/evm-actions";
import type {
  EvmMetricsData,
  TaskEvmDataSerialized,
  ScheduleForecastData,
  EvmBreakdownRow,
} from "@/applications/evm/evm-dashboard-dto";
import { exportTableData } from "@/utils/export-table";
import { formatEvmCsvValue } from "@/utils/evm-format";
import {
  EVM_FORECAST_METHOD_LABELS,
  type EvmForecastMethod,
} from "@/types/evm-forecast-method";
import {
  Loader2,
  TrendingUp,
  DollarSign,
  Info,
  Download,
  RefreshCcw,
} from "lucide-react";
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
  /** プロジェクト設定の予測方式。ダッシュボード上で一時的に切り替えられる */
  defaultForecastMethod?: EvmForecastMethod;
};

export function EvmDashboard({
  wbsId,
  defaultProgressMethod,
  defaultForecastMethod,
}: EvmDashboardProps) {
  const [currentMetrics, setCurrentMetrics] = useState<EvmMetricsData | null>(
    null
  );
  const [timeSeriesData, setTimeSeriesData] = useState<EvmMetricsData[]>([]);
  const [taskDetails, setTaskDetails] = useState<TaskEvmDataSerialized[]>([]);
  const [scheduleForecast, setScheduleForecast] =
    useState<ScheduleForecastData | null>(null);
  const [phaseBreakdown, setPhaseBreakdown] = useState<EvmBreakdownRow[]>([]);
  const [assigneeBreakdown, setAssigneeBreakdown] = useState<EvmBreakdownRow[]>(
    []
  );
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

  // 予測方式（EAC/ETC/VACの算出前提）
  const [forecastMethod, setForecastMethod] = useState<EvmForecastMethod>(
    defaultForecastMethod ?? "CPI_ONLY"
  );

  // 時系列間隔（既定は週次。全期間×日次は点が多く重いうえ、
  // server action の zod 既定も weekly のため揃える）
  const [interval, setInterval] = useState<"daily" | "weekly" | "monthly">(
    "weekly"
  );

  // 最終データ取得時刻（インポート直後の古い数字で判断しないための手がかり）
  const [lastLoadedAt, setLastLoadedAt] = useState<Date | null>(null);

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
    forecastMethod,
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
        forecastMethod,
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
      setScheduleForecast(result.data.scheduleForecast ?? null);
      setPhaseBreakdown(result.data.phaseBreakdown ?? []);
      setAssigneeBreakdown(result.data.assigneeBreakdown ?? []);
      setLastLoadedAt(new Date());
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

  // CSVの丸めは画面表示（utils/evm-format）と同一基準にする
  const formatCsvValue = (value: number): string =>
    formatEvmCsvValue(value, calculationMode);

  // 実績(WorkRecord)が1件も無いのに進捗率が入っている状態。
  // ライブEVは実績開始日でゲートされるためEV/SPIが過小に出る（月報未取込のサイン）。
  const actualsNotImported =
    currentMetrics.ac === 0 && taskDetails.some((t) => t.progressRate > 0);

  // 内訳表の色分けもヘルスバッジと同じプロジェクト設定しきい値に揃える
  const breakdownThresholds = {
    healthy: currentMetrics.healthyThreshold,
    warning: currentMetrics.warningThreshold,
  };

  const handleExportTimeSeries = () => {
    exportTableData(
      [
        "評価日",
        "PV_BASE",
        "PV",
        "EV",
        "AC",
        "BAC",
        "SV",
        "CV",
        "SPI",
        "CPI",
        "完了率(%)",
        "EAC",
        "ETC",
        "VAC",
        "健全性",
        "予測",
      ],
      timeSeriesData.map((m) => [
        new Date(m.date).toLocaleDateString("ja-JP"),
        formatCsvValue(m.pv_base),
        formatCsvValue(m.pv),
        formatCsvValue(m.ev),
        formatCsvValue(m.ac),
        formatCsvValue(m.bac),
        formatCsvValue(m.sv),
        formatCsvValue(m.cv),
        m.spi !== null ? m.spi.toFixed(3) : "",
        m.cpi !== null ? m.cpi.toFixed(3) : "",
        m.completionRate.toFixed(1),
        formatCsvValue(m.eac),
        formatCsvValue(m.etc),
        formatCsvValue(m.vac),
        m.healthStatus,
        m.isPredicted ? "予測" : "実績",
      ]),
      { filename: "evm-timeseries", format: "csv" }
    );
  };

  const handleExportTaskDetails = () => {
    exportTableData(
      [
        "タスクNo",
        "タスク名",
        "ステータス",
        "計画工数(h)",
        "実績工数(h)",
        "進捗率(%)",
        "出来高",
        "単価",
      ],
      taskDetails.map((t) => [
        t.taskNo,
        t.taskName,
        t.status,
        t.plannedManHours.toFixed(1),
        t.actualManHours.toFixed(1),
        Math.round(t.methodProgressRate),
        formatCsvValue(
          calculationMode === "cost" ? t.methodEarnedValueCost : t.methodEarnedValue
        ),
        t.costPerHour,
      ]),
      { filename: "evm-tasks", format: "csv" }
    );
  };

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

            <div className="flex items-center gap-1.5">
              <Label htmlFor="forecast-method" className="text-xs whitespace-nowrap text-muted-foreground">予測方式</Label>
              <Select
                value={forecastMethod}
                onValueChange={(value) =>
                  setForecastMethod(value as EvmForecastMethod)
                }
              >
                <SelectTrigger id="forecast-method" className="h-7 text-xs w-[110px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(
                    Object.keys(EVM_FORECAST_METHOD_LABELS) as EvmForecastMethod[]
                  ).map((method) => (
                    <SelectItem key={method} value={method}>
                      {EVM_FORECAST_METHOD_LABELS[method]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-1.5 ml-auto">
              {lastLoadedAt && (
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  取得: {lastLoadedAt.toLocaleTimeString("ja-JP")}
                </span>
              )}
              {/* インポート完了後にEVMは自動更新されないため、明示的な再取得手段を置く */}
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs"
                onClick={loadEvmData}
                title="EVMデータを再取得します（インポート実行後にご利用ください）"
              >
                <RefreshCcw className="h-3 w-3 mr-1" />
                更新
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs"
                onClick={handleExportTimeSeries}
              >
                <Download className="h-3 w-3 mr-1" />
                時系列CSV
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs"
                onClick={handleExportTaskDetails}
              >
                <Download className="h-3 w-3 mr-1" />
                タスクCSV
              </Button>
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

      {/* メトリクスカード（週次レビューで最重要のため最上部に置く） */}
      <EvmMetricsCard
        metrics={currentMetrics}
        scheduleForecast={scheduleForecast}
        actualsNotImported={actualsNotImported}
      />

      {/* タブ */}
      <Tabs defaultValue="chart" className="space-y-4">
        <TabsList>
          <TabsTrigger value="chart">トレンドチャート</TabsTrigger>
          <TabsTrigger value="timeseries">時系列データ</TabsTrigger>
          <TabsTrigger value="tasks">タスク別詳細</TabsTrigger>
          <TabsTrigger value="breakdown">内訳</TabsTrigger>
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

        <TabsContent value="breakdown" className="space-y-4">
          <EvmBreakdownTable
            title="フェーズ別内訳"
            rows={phaseBreakdown}
            calculationMode={calculationMode}
            thresholds={breakdownThresholds}
            note="現在時点のライブタスクによる集計です。BACにバッファは含まれません。「未紐付け・削除済み」はタスクに紐付かない実績と削除済みタスクの実績です。"
          />
          <EvmBreakdownTable
            title="担当者別内訳"
            rows={assigneeBreakdown}
            calculationMode={calculationMode}
            thresholds={breakdownThresholds}
            note="担当者軸はタスクの現担当者です（作業実績の記録者ではありません）。BACにバッファは含まれません。"
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
