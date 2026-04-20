"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { QualityTrendPoint } from "@/applications/quality/quality-application.service";

interface QualityTrendChartProps {
  data: QualityTrendPoint[];
  fromDate?: string;
  toDate?: string;
  onDateChange?: (fromDate: string, toDate: string) => void;
}

export function QualityTrendChart({
  data,
  fromDate = "",
  toDate = "",
  onDateChange,
}: QualityTrendChartProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 flex-wrap gap-2">
        <CardTitle className="text-base">日次推移</CardTitle>
        {onDateChange && (
          <div className="flex items-center gap-2 flex-wrap">
            <Input
              type="date"
              value={fromDate}
              onChange={(e) => onDateChange(e.target.value, toDate)}
              className="w-[140px] h-8 text-xs"
            />
            <span className="text-xs text-gray-400">〜</span>
            <Input
              type="date"
              value={toDate}
              onChange={(e) => onDateChange(fromDate, e.target.value)}
              className="w-[140px] h-8 text-xs"
            />
          </div>
        )}
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <div className="text-center py-8 text-gray-500 text-sm">
            推移データがありません。
          </div>
        ) : (
          <div className="w-full h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis
                  yAxisId="density"
                  orientation="left"
                  tick={{ fontSize: 11 }}
                  label={{
                    value: "指摘密度",
                    angle: -90,
                    position: "insideLeft",
                    style: { fontSize: 11, fill: "#6b7280" },
                  }}
                />
                <YAxis
                  yAxisId="review"
                  orientation="right"
                  tick={{ fontSize: 11 }}
                  label={{
                    value: "レビュー密度",
                    angle: 90,
                    position: "insideRight",
                    style: { fontSize: 11, fill: "#6b7280" },
                  }}
                />
                <Tooltip
                  formatter={(value) => {
                    if (value === null || value === undefined) return "-";
                    const n = typeof value === "number" ? value : Number(value);
                    return Number.isFinite(n) ? n.toFixed(4) : "-";
                  }}
                />
                <Legend />
                <Line
                  yAxisId="density"
                  type="monotone"
                  dataKey="defectDensity"
                  name="指摘密度"
                  stroke="#ef4444"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  connectNulls
                />
                <Line
                  yAxisId="density"
                  type="monotone"
                  dataKey="majorDefectDensity"
                  name="Major指摘密度"
                  stroke="#b91c1c"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  connectNulls
                />
                <Line
                  yAxisId="review"
                  type="monotone"
                  dataKey="reviewDensity"
                  name="レビュー密度"
                  stroke="#2563eb"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  connectNulls
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
