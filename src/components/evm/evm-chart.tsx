"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import type { EvmMetricsData } from "@/app/actions/evm/evm-actions";
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

  // データをチャート用に変換
  const chartData = data.map((metrics) => ({
    date: new Date(metrics.date).toLocaleDateString("ja-JP", {
      month: "short",
      day: "numeric",
    }),
    PV_BASE: metrics.pv_base,
    PV: metrics.pv,
    EV: metrics.ev,
    AC: metrics.ac,
  }));

  // 現在日付のラベル（X軸のフォーマットと合わせる）
  const todayLabel = new Date().toLocaleDateString("ja-JP", {
    month: "short",
    day: "numeric",
  });

  // PVの最大値
  const maxPv = Math.max(...data.map((metrics) => metrics.pv));

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
            <XAxis dataKey="date" />
            <YAxis tickFormatter={(value) => formatValue(value)} />
            <Tooltip
              formatter={(value: number) => formatValue(value)}
              labelStyle={{ color: "#000" }}
            />
            <Legend />
            <ReferenceLine
              x={todayLabel}
              stroke="#ef4444"
              strokeDasharray="4 4"
            />
            <ReferenceLine
              y={maxPv}
              stroke="red"
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
