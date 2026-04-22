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
import { QualitySizeUnit } from "@/domains/quality/value-objects/quality-enums";
import { getMetricDefinitions } from "@/domains/quality/value-objects/metric-definition";

const LINE_COLORS = ["#ef4444", "#2563eb", "#10b981", "#f59e0b"];

interface QualityTrendChartProps {
  data: QualityTrendPoint[];
  sizeUnit?: QualitySizeUnit | "MAN_HOUR";
  fromDate?: string;
  toDate?: string;
  onDateChange?: (fromDate: string, toDate: string) => void;
}

export function QualityTrendChart({
  data,
  sizeUnit = "MAN_HOUR",
  fromDate = "",
  toDate = "",
  onDateChange,
}: QualityTrendChartProps) {
  const definitions = getMetricDefinitions(sizeUnit);

  // Flatten metrics for Recharts (it doesn't support nested dataKey well)
  const flatData = data.map((point) => {
    const flat: Record<string, unknown> = { ...point };
    if (point.metrics) {
      for (const [key, value] of Object.entries(point.metrics)) {
        flat[`metric_${key}`] = value;
      }
    }
    return flat;
  });

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
              <LineChart data={flatData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                {definitions.map((def, i) => (
                  <YAxis
                    key={def.key}
                    yAxisId={def.key}
                    orientation={i === 0 ? "left" : "right"}
                    tick={{ fontSize: 11 }}
                    label={{
                      value: def.label,
                      angle: i === 0 ? -90 : 90,
                      position: i === 0 ? "insideLeft" : "insideRight",
                      style: { fontSize: 11, fill: "#6b7280" },
                    }}
                  />
                ))}
                <Tooltip
                  formatter={(value) => {
                    if (value === null || value === undefined) return "-";
                    const n = typeof value === "number" ? value : Number(value);
                    return Number.isFinite(n) ? n.toFixed(4) : "-";
                  }}
                />
                <Legend />
                {definitions.map((def, i) => (
                  <Line
                    key={def.key}
                    yAxisId={def.key}
                    type="monotone"
                    dataKey={`metric_${def.key}`}
                    name={def.label}
                    stroke={LINE_COLORS[i % LINE_COLORS.length]}
                    strokeWidth={2}
                    dot={{ r: 3 }}
                    connectNulls
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
