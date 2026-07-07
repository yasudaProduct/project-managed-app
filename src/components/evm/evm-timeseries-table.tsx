"use client";

import { useState } from "react";
import { formatDate as formatDateUtil } from "@/utils/date-util";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import type { EvmMetricsData } from "@/applications/evm/evm-dashboard-dto";
import { CheckCircle, AlertTriangle, AlertCircle, Minus } from "lucide-react";

type EvmTimeSeriesTableProps = {
  data: EvmMetricsData[];
  calculationMode: "hours" | "cost";
};

/**
 * EVM時系列データテーブル
 * @param data 時系列データ
 * @param calculationMode 計算モード
 */
export function EvmTimeSeriesTable({
  data,
  calculationMode,
}: EvmTimeSeriesTableProps) {
  const [selectedMetrics, setSelectedMetrics] =
    useState<EvmMetricsData | null>(null);

  const formatValue = (value: number): string => {
    if (calculationMode === "cost") {
      return `¥${value.toLocaleString()}`;
    }
    return `${value.toFixed(1)}h`;
  };

  const getHealthBadge = (
    status: "healthy" | "warning" | "critical" | "no_data"
  ) => {
    switch (status) {
      case "healthy":
        return (
          <Badge className="bg-green-500 hover:bg-green-600">
            <CheckCircle className="h-3 w-3 mr-1" />
            健全
          </Badge>
        );
      case "warning":
        return (
          <Badge className="bg-yellow-500 hover:bg-yellow-600">
            <AlertTriangle className="h-3 w-3 mr-1" />
            注意
          </Badge>
        );
      case "critical":
        return (
          <Badge variant="destructive">
            <AlertCircle className="h-3 w-3 mr-1" />
            危機的
          </Badge>
        );
      case "no_data":
        return (
          <Badge variant="secondary">
            <Minus className="h-3 w-3 mr-1" />
            開始前
          </Badge>
        );
    }
  };

  const getVarianceColorClass = (value: number): string => {
    if (value > 0) return "text-green-600 font-semibold";
    if (value < 0) return "text-red-600 font-semibold";
    return "text-gray-600";
  };

  const getEtcFormula = (method?: string) => {
    switch (method) {
      case "CPI_SPI":
        return "(BAC - EV) / (CPI × SPI)";
      case "PLANNED":
        return "BAC - EV";
      default:
        return "(BAC - EV) / CPI";
    }
  };

  const formatDate = (dateStr: string) =>
    formatDateUtil(new Date(dateStr), "YYYY/MM/DD");

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>EVM時系列データ一覧</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[120px]">評価日</TableHead>
                  <TableHead className="text-right">PV_BASE</TableHead>
                  <TableHead className="text-right">PV</TableHead>
                  <TableHead className="text-right">EV</TableHead>
                  <TableHead className="text-right">AC</TableHead>
                  <TableHead className="text-right">BAC</TableHead>
                  <TableHead className="text-right">SV</TableHead>
                  <TableHead className="text-right">CV</TableHead>
                  <TableHead className="text-right">SPI</TableHead>
                  <TableHead className="text-right">CPI</TableHead>
                  <TableHead className="text-right">完了率</TableHead>
                  <TableHead className="text-right">EAC</TableHead>
                  <TableHead className="text-right">ETC</TableHead>
                  <TableHead className="text-right">VAC</TableHead>
                  <TableHead className="min-w-[100px]">ステータス</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={15}
                      className="text-center text-muted-foreground"
                    >
                      データがありません
                    </TableCell>
                  </TableRow>
                ) : (
                  data.map((metrics, index) => (
                    <TableRow key={index}>
                      <TableCell
                        className="font-medium cursor-pointer text-blue-600 hover:text-blue-800 hover:underline"
                        onClick={() => setSelectedMetrics(metrics)}
                      >
                        {formatDate(metrics.date)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatValue(metrics.pv_base)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatValue(metrics.pv)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatValue(metrics.ev)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatValue(metrics.ac)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatValue(metrics.bac)}
                      </TableCell>
                      <TableCell
                        className={`text-right ${getVarianceColorClass(
                          metrics.sv,
                        )}`}
                      >
                        {formatValue(metrics.sv)}
                      </TableCell>
                      <TableCell
                        className={`text-right ${getVarianceColorClass(
                          metrics.cv,
                        )}`}
                      >
                        {formatValue(metrics.cv)}
                      </TableCell>
                      <TableCell className="text-right">
                        {metrics.spi !== null ? metrics.spi.toFixed(3) : "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        {metrics.cpi !== null ? metrics.cpi.toFixed(3) : "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        {metrics.completionRate.toFixed(1)}%
                      </TableCell>
                      <TableCell className="text-right">
                        {formatValue(metrics.eac)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatValue(metrics.etc)}
                      </TableCell>
                      <TableCell
                        className={`text-right ${getVarianceColorClass(
                          metrics.vac,
                        )}`}
                      >
                        {formatValue(metrics.vac)}
                      </TableCell>
                      <TableCell>
                        {getHealthBadge(metrics.healthStatus)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* 凡例 */}
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="space-y-2">
              <h4 className="font-semibold">基本指標</h4>
              <ul className="space-y-1 text-muted-foreground">
                <li>
                  <span className="font-medium">PV (計画価値):</span>{" "}
                  計画通りの進捗を示す基準線
                </li>
                <li>
                  <span className="font-medium">EV (出来高):</span>{" "}
                  実際に完了した作業の価値
                </li>
                <li>
                  <span className="font-medium">AC (実コスト):</span>{" "}
                  実際に投入したコスト
                </li>
                <li>
                  <span className="font-medium">BAC (完了時予算):</span>{" "}
                  プロジェクト完了時の総予算
                </li>
              </ul>
            </div>

            <div className="space-y-2">
              <h4 className="font-semibold">差異・予測指標</h4>
              <ul className="space-y-1 text-muted-foreground">
                <li>
                  <span className="font-medium">SV (スケジュール差異):</span> EV -
                  PV
                </li>
                <li>
                  <span className="font-medium">CV (コスト差異):</span> EV - AC
                </li>
                <li>
                  <span className="font-medium">SPI (スケジュール効率指数):</span>{" "}
                  EV / PV
                </li>
                <li>
                  <span className="font-medium">CPI (コスト効率指数):</span> EV /
                  AC
                </li>
                <li>
                  <span className="font-medium">ETC (残コスト):</span>{" "}
                  {getEtcFormula(data[0]?.forecastMethod)}{" "}
                  残作業に必要な予測コスト
                </li>
                <li>
                  <span className="font-medium">EAC (完了時総コスト):</span>{" "}
                  AC + ETC 完了時の予測総コスト
                </li>
                <li>
                  <span className="font-medium">VAC (完了時差異):</span> BAC - EAC
                </li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 指標詳細サイドパネル */}
      <Sheet
        open={selectedMetrics !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedMetrics(null);
        }}
      >
        <SheetContent side="right" className="w-[420px] sm:max-w-[420px] overflow-y-auto">
          {selectedMetrics && (
            <>
              <SheetHeader>
                <SheetTitle>
                  EVM指標詳細
                </SheetTitle>
                <SheetDescription>
                  {formatDate(selectedMetrics.date)}
                  {selectedMetrics.isPredicted && (
                    <Badge variant="outline" className="ml-2">予測</Badge>
                  )}
                </SheetDescription>
              </SheetHeader>

              <div className="mt-6 space-y-6">
                {/* 基本指標 */}
                <section>
                  <h4 className="text-sm font-semibold mb-3">基本指標</h4>
                  <div className="space-y-2">
                    <MetricRow
                      label="PV_BASE (基準計画価値)"
                      value={formatValue(selectedMetrics.pv_base)}
                      description="当初計画に基づく計画価値"
                    />
                    <MetricRow
                      label="PV (計画価値)"
                      value={formatValue(selectedMetrics.pv)}
                      description="変更管理を反映した計画価値"
                    />
                    <MetricRow
                      label="EV (出来高)"
                      value={formatValue(selectedMetrics.ev)}
                      description="実際に完了した作業の価値"
                    />
                    <MetricRow
                      label="AC (実コスト)"
                      value={formatValue(selectedMetrics.ac)}
                      description="実際に投入したコスト"
                    />
                    <MetricRow
                      label="BAC (完了時予算)"
                      value={formatValue(selectedMetrics.bac)}
                      description="プロジェクト完了時の総予算"
                    />
                  </div>
                </section>

                <Separator />

                {/* 差異指標 */}
                <section>
                  <h4 className="text-sm font-semibold mb-3">差異指標</h4>
                  <div className="space-y-2">
                    <MetricRow
                      label="SV (スケジュール差異)"
                      value={formatValue(selectedMetrics.sv)}
                      formula={`EV - PV = ${formatValue(selectedMetrics.ev)} - ${formatValue(selectedMetrics.pv)}`}
                      valueClass={getVarianceColorClass(selectedMetrics.sv)}
                    />
                    <MetricRow
                      label="CV (コスト差異)"
                      value={formatValue(selectedMetrics.cv)}
                      formula={`EV - AC = ${formatValue(selectedMetrics.ev)} - ${formatValue(selectedMetrics.ac)}`}
                      valueClass={getVarianceColorClass(selectedMetrics.cv)}
                    />
                  </div>
                </section>

                <Separator />

                {/* 効率指標 */}
                <section>
                  <h4 className="text-sm font-semibold mb-3">効率指標</h4>
                  <div className="space-y-2">
                    <MetricRow
                      label="SPI (スケジュール効率指数)"
                      value={
                        selectedMetrics.spi !== null
                          ? selectedMetrics.spi.toFixed(3)
                          : "—"
                      }
                      formula={`EV / PV = ${formatValue(selectedMetrics.ev)} / ${formatValue(selectedMetrics.pv)}`}
                      description={
                        selectedMetrics.spi === null
                          ? "計画価値が未発生のため算出不可"
                          : selectedMetrics.spi >= 1
                            ? "計画以上のペースで進捗"
                            : "計画より遅れている"
                      }
                    />
                    <MetricRow
                      label="CPI (コスト効率指数)"
                      value={
                        selectedMetrics.cpi !== null
                          ? selectedMetrics.cpi.toFixed(3)
                          : "—"
                      }
                      formula={`EV / AC = ${formatValue(selectedMetrics.ev)} / ${formatValue(selectedMetrics.ac)}`}
                      description={
                        selectedMetrics.cpi === null
                          ? "実績コストが未投入のため算出不可"
                          : selectedMetrics.cpi >= 1
                            ? "予算内で効率的に推進"
                            : "コスト超過傾向"
                      }
                    />
                    <MetricRow
                      label="完了率"
                      value={`${selectedMetrics.completionRate.toFixed(1)}%`}
                      formula={`EV / BAC × 100 = ${formatValue(selectedMetrics.ev)} / ${formatValue(selectedMetrics.bac)} × 100`}
                    />
                  </div>
                </section>

                <Separator />

                {/* 予測指標 */}
                <section>
                  <h4 className="text-sm font-semibold mb-3">予測指標</h4>
                  <div className="space-y-2">
                    <MetricRow
                      label="ETC (残作業コスト)"
                      value={formatValue(selectedMetrics.etc)}
                      formula={`${getEtcFormula(selectedMetrics.forecastMethod)} = ${formatEtcCalculation(selectedMetrics)}`}
                      description={`予測方式: ${getForecastMethodLabel(selectedMetrics.forecastMethod)}`}
                    />
                    <MetricRow
                      label="EAC (完了時総コスト予測)"
                      value={formatValue(selectedMetrics.eac)}
                      formula={`AC + ETC = ${formatValue(selectedMetrics.ac)} + ${formatValue(selectedMetrics.etc)}`}
                      valueClass={getVarianceColorClass(selectedMetrics.bac - selectedMetrics.eac)}
                    />
                    <MetricRow
                      label="VAC (完了時コスト差異)"
                      value={formatValue(selectedMetrics.vac)}
                      formula={`BAC - EAC = ${formatValue(selectedMetrics.bac)} - ${formatValue(selectedMetrics.eac)}`}
                      valueClass={getVarianceColorClass(selectedMetrics.vac)}
                      description={
                        selectedMetrics.vac >= 0
                          ? "予算内で完了見込み"
                          : "予算超過見込み"
                      }
                    />
                  </div>
                </section>

                <Separator />

                {/* ステータス */}
                <section>
                  <h4 className="text-sm font-semibold mb-3">プロジェクト健全性</h4>
                  <div className="flex items-center gap-2">
                    {getHealthBadge(selectedMetrics.healthStatus)}
                    <span className="text-sm text-muted-foreground">
                      {selectedMetrics.healthStatus === "healthy"
                        ? "SPI・CPIともに良好な状態です"
                        : selectedMetrics.healthStatus === "warning"
                          ? "一部の指標に注意が必要です"
                          : selectedMetrics.healthStatus === "no_data"
                            ? "プロジェクト開始前、または実績データがありません"
                            : "早急な対策が必要です"}
                    </span>
                  </div>
                </section>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}

function MetricRow({
  label,
  value,
  formula,
  description,
  valueClass,
}: {
  label: string;
  value: string;
  formula?: string;
  description?: string;
  valueClass?: string;
}) {
  return (
    <div className="rounded-md border p-3">
      <div className="flex justify-between items-baseline">
        <span className="text-sm font-medium">{label}</span>
        <span className={`text-sm font-mono ${valueClass ?? ""}`}>{value}</span>
      </div>
      {formula && (
        <p className="text-xs text-muted-foreground mt-1 font-mono bg-muted px-2 py-1 rounded">
          {formula}
        </p>
      )}
      {description && (
        <p className="text-xs text-muted-foreground mt-1">{description}</p>
      )}
    </div>
  );
}

function getForecastMethodLabel(method?: string): string {
  switch (method) {
    case "CPI_SPI":
      return "CPI×SPI法";
    case "PLANNED":
      return "計画法";
    default:
      return "CPI法";
  }
}

function formatEtcCalculation(m: EvmMetricsData): string {
  const formatNum = (v: number) => v.toFixed(1);
  const bac_ev = m.bac - m.ev;
  // 未定義（null）の効率指標は係数1として計算される（ドメイン実装と同一ルール）
  const cpiStr = m.cpi !== null ? m.cpi.toFixed(3) : "1.000（CPI未定義）";
  const spiStr = m.spi !== null ? m.spi.toFixed(3) : "1.000（SPI未定義）";
  switch (m.forecastMethod) {
    case "CPI_SPI":
      return `(${formatNum(m.bac)} - ${formatNum(m.ev)}) / (${cpiStr} × ${spiStr})`;
    case "PLANNED":
      return `${formatNum(m.bac)} - ${formatNum(m.ev)} = ${formatNum(bac_ev)}`;
    default:
      return `(${formatNum(m.bac)} - ${formatNum(m.ev)}) / ${cpiStr}`;
  }
}
