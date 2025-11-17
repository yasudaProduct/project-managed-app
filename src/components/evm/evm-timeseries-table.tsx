"use client";

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
import type { EvmMetricsData } from "@/app/actions/evm/evm-actions";
import { CheckCircle, AlertTriangle, AlertCircle } from "lucide-react";

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
  /**
   * 値をフォーマット
   * @param value 値
   */
  const formatValue = (value: number): string => {
    if (calculationMode === "cost") {
      return `¥${value.toLocaleString()}`;
    }
    return `${value.toFixed(1)}h`;
  };

  /**
   * ヘルスステータスのバッジを取得
   * @param status ステータス
   */
  const getHealthBadge = (status: "healthy" | "warning" | "critical") => {
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
    }
  };

  /**
   * 差異の色クラスを取得
   * @param value 差異値
   */
  const getVarianceColorClass = (value: number): string => {
    if (value > 0) return "text-green-600 font-semibold";
    if (value < 0) return "text-red-600 font-semibold";
    return "text-gray-600";
  };

  return (
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
                  <TableCell colSpan={14} className="text-center text-muted-foreground">
                    データがありません
                  </TableCell>
                </TableRow>
              ) : (
                data.map((metrics, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">
                      {new Date(metrics.date).toLocaleDateString("ja-JP", {
                        year: "numeric",
                        month: "2-digit",
                        day: "2-digit",
                      })}
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
                        metrics.sv
                      )}`}
                    >
                      {formatValue(metrics.sv)}
                    </TableCell>
                    <TableCell
                      className={`text-right ${getVarianceColorClass(
                        metrics.cv
                      )}`}
                    >
                      {formatValue(metrics.cv)}
                    </TableCell>
                    <TableCell className="text-right">
                      {metrics.spi.toFixed(3)}
                    </TableCell>
                    <TableCell className="text-right">
                      {metrics.cpi.toFixed(3)}
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
                        metrics.vac
                      )}`}
                    >
                      {formatValue(metrics.vac)}
                    </TableCell>
                    <TableCell>{getHealthBadge(metrics.healthStatus)}</TableCell>
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
                <span className="font-medium">EAC (完了時総コスト):</span>{" "}
                完了時の予測総コスト
              </li>
              <li>
                <span className="font-medium">ETC (残コスト):</span>{" "}
                残作業に必要な予測コスト
              </li>
              <li>
                <span className="font-medium">VAC (完了時差異):</span> BAC - EAC
              </li>
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
