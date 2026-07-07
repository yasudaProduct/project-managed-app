"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import type { EvmMetricsData } from "@/applications/evm/evm-dashboard-dto";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { useState } from "react";

type EvmChartProps = {
  data: EvmMetricsData[];
  calculationMode: "hours" | "cost";
};

/**
 * EVMトレンドチャート
 * @param data データ
 * @param calculationMode 計算モード
 */
export function EvmChart({ data, calculationMode }: EvmChartProps) {
  const [showPvBase, setShowPvBase] = useState(true);

  // データをチャート用に変換（X軸は時間軸＝エポックms）
  const chartData = data.map((metrics, index) => {
    const nextMetrics = data[index + 1];
    // 次のデータが予測値の場合、現在のデータ（実績）を予測線の開始点としても使用する
    const isLastActual = !metrics.isPredicted && nextMetrics?.isPredicted;

    return {
      ts: new Date(metrics.date).getTime(),
      PV_BASE: metrics.pv_base,
      PV: metrics.pv,
      // 実績データ（予測データの場合はnull）
      EV: !metrics.isPredicted ? metrics.ev : null,
      AC: !metrics.isPredicted ? metrics.ac : null,
      // 予測データ（実績データの場合はnull、ただしつなぎ目の点は含める）
      EV_PREDICTED: metrics.isPredicted || isLastActual ? metrics.ev : null,
      AC_PREDICTED: metrics.isPredicted || isLastActual ? metrics.ac : null,
    };
  });

  const formatTick = (ts: number): string =>
    new Date(ts).toLocaleDateString("ja-JP", {
      month: "short",
      day: "numeric",
    });

  const formatTooltipLabel = (ts: number): string =>
    new Date(ts).toLocaleDateString("ja-JP");

  // BAC（完了時予算）。時系列途中でタスク追加等によりBACが変わるため、最新時点の値を使う
  const bacValue = data.length > 0 ? data[data.length - 1].bac : 0;

  /**
   * 値を計算モードに応じてフォーマット
   * @param value 値
   */
  const formatValue = (value: number): string => {
    if (calculationMode === "cost") {
      return `¥${value.toLocaleString()}`;
    }
    return `${value.toFixed(1)}h`;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>EVMトレンドチャート</CardTitle>
          <div className="flex items-center space-x-2">
            <Switch
              id="show-pv-base"
              checked={showPvBase}
              onCheckedChange={setShowPvBase}
            />
            <Label htmlFor="show-pv-base">当初計画を表示</Label>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={600}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            {/* 時間軸（数値）。カテゴリ軸だと今日線が刻みと一致した時しか描画されず、
                年跨ぎで同一ラベルが衝突するため、エポックmsの数値軸にする */}
            <XAxis
              dataKey="ts"
              type="number"
              scale="time"
              domain={["dataMin", "dataMax"]}
              tickFormatter={formatTick}
            />
            <YAxis tickFormatter={(value) => formatValue(value)} />
            <Tooltip
              formatter={(value: number) => formatValue(value)}
              labelFormatter={(ts) => formatTooltipLabel(Number(ts))}
              labelStyle={{ color: "#000" }}
            />
            <Legend />
            <ReferenceLine
              x={Date.now()}
              stroke="#ef4444"
              strokeDasharray="4 4"
              label={{
                value: "今日",
                position: "top",
                fill: "#ef4444",
                fontSize: 12,
              }}
            />
            <ReferenceLine
              y={bacValue}
              stroke="red"
              ifOverflow="extendDomain"
              label={{
                value: "BAC",
                position: "top",
                fill: "red",
                fontSize: 12,
              }}
            />
            <Line
              type="monotone"
              dataKey="PV_BASE"
              stroke="#585555ff"
              name="当初計画価値 (PV)"
              strokeDasharray="5 5"
              strokeWidth={1}
              hide={!showPvBase}
            />
            <Line
              type="monotone"
              dataKey="PV"
              stroke="#8884d8"
              name="計画価値 (PV)"
              strokeWidth={2}
            />
            {/* 実績線 */}
            <Line
              type="monotone"
              dataKey="EV"
              stroke="#82ca9d"
              name="出来高 (EV)"
              strokeWidth={2}
            />
            <Line
              type="monotone"
              dataKey="AC"
              stroke="#ffc658"
              name="実コスト (AC)"
              strokeWidth={2}
            />
            {/* 予測線 */}
            <Line
              type="monotone"
              dataKey="EV_PREDICTED"
              stroke="#82ca9d"
              name="予測出来高 (EV)"
              strokeDasharray="5 5"
              strokeWidth={2}
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="AC_PREDICTED"
              stroke="#ffc658"
              name="予測コスト (AC)"
              strokeDasharray="5 5"
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>

        <div className="mt-4 grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="flex items-center justify-center gap-2">
              <div className="w-4 h-0.5 bg-[#8884d8]" />
              <span className="text-sm font-medium">PV (計画価値)</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              計画通りの進捗を示す基準線
            </p>
          </div>
          <div>
            <div className="flex items-center justify-center gap-2">
              <div className="w-4 h-0.5 bg-[#82ca9d]" />
              <span className="text-sm font-medium">EV (出来高)</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              実際に完了した作業の価値
            </p>
          </div>
          <div>
            <div className="flex items-center justify-center gap-2">
              <div className="w-4 h-0.5 bg-[#ffc658]" />
              <span className="text-sm font-medium">AC (実コスト)</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              実際に投入したコスト
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
