"use client";

import { useMemo, useState } from "react";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import type { QualityTrendPoint } from "@/applications/quality/quality-application.service";
import type { QualityThreshold } from "@/domains/quality/value-objects/quality-threshold";

type MetricKey = "defectDensity" | "majorDefectDensity" | "reviewDensity";

const METRIC_LABEL: Record<MetricKey, string> = {
  defectDensity: "指摘密度",
  majorDefectDensity: "Major指摘密度",
  reviewDensity: "レビュー密度",
};

interface QualityTrendChartProps {
  data: QualityTrendPoint[];
  thresholds?: {
    defectDensity?: QualityThreshold;
    majorDefectDensity?: QualityThreshold;
    reviewDensity?: QualityThreshold;
  };
  fromDate?: string;
  toDate?: string;
  onDateChange?: (fromDate: string, toDate: string) => void;
}

export function QualityTrendChart({
  data,
  thresholds,
  fromDate = "",
  toDate = "",
  onDateChange,
}: QualityTrendChartProps) {
  const [metric, setMetric] = useState<MetricKey>("defectDensity");

  const chartData = useMemo(() => {
    return data.map((p) => ({
      date: p.date,
      value: p[metric],
    }));
  }, [data, metric]);

  const threshold = thresholds?.[metric];

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 flex-wrap gap-2">
        <CardTitle className="text-base">日次推移</CardTitle>
        <div className="flex items-center gap-2 flex-wrap">
          {onDateChange && (
            <>
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
            </>
          )}
          <Select value={metric} onValueChange={(v) => setMetric(v as MetricKey)}>
            <SelectTrigger className="w-[160px] h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(METRIC_LABEL).map(([k, label]) => (
                <SelectItem key={k} value={k}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {chartData.length === 0 ? (
          <div className="text-center py-8 text-gray-500 text-sm">
            推移データがありません。
          </div>
        ) : (
          <div className="w-full h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip
                  formatter={(value) => {
                    if (value === null || value === undefined) return "-";
                    const n = typeof value === "number" ? value : Number(value);
                    return Number.isFinite(n) ? n.toFixed(4) : "-";
                  }}
                />
                <Legend />
                {threshold && (
                  <>
                    <ReferenceLine
                      y={threshold.warnThreshold}
                      stroke="#eab308"
                      strokeDasharray="4 4"
                      label={{ value: "警告", position: "right", fontSize: 10 }}
                    />
                    <ReferenceLine
                      y={threshold.dangerThreshold}
                      stroke="#ef4444"
                      strokeDasharray="4 4"
                      label={{ value: "危険", position: "right", fontSize: 10 }}
                    />
                  </>
                )}
                <Line
                  type="monotone"
                  dataKey="value"
                  name={METRIC_LABEL[metric]}
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
