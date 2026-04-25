"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getPbCurveData } from "@/app/wbs/[id]/actions/quality-actions";
import type { PbCurvePoint } from "@/domains/quality/services/pb-curve-analyzer";

interface Props {
  targets: { id: number; name: string; taskNo: string }[];
}

export function PbCurveChart({ targets }: Props) {
  const [selectedTargetId, setSelectedTargetId] = useState<string>(
    targets[0]?.id?.toString() ?? ""
  );
  const [data, setData] = useState<PbCurvePoint[]>([]);

  const fetchData = useCallback(async () => {
    if (!selectedTargetId) return;
    const result = await getPbCurveData(Number(selectedTargetId));
    setData(result);
  }, [selectedTargetId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const chartData = data.map((p) => ({
    date: new Date(p.date).toLocaleDateString("ja-JP", { month: "short", day: "numeric" }),
    remaining: p.remaining,
    bugCumulative: p.bugCumulative,
    plannedRemaining: p.plannedRemaining,
  }));

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">対象:</span>
        <Select value={selectedTargetId} onValueChange={setSelectedTargetId}>
          <SelectTrigger className="w-[200px] h-8 text-xs">
            <SelectValue placeholder="評価対象を選択" />
          </SelectTrigger>
          <SelectContent>
            {targets.map((t) => (
              <SelectItem key={t.id} value={t.id.toString()}>
                {t.taskNo}: {t.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <ResponsiveContainer width="100%" height={300}>
        <ComposedChart data={chartData} margin={{ top: 10, right: 10, bottom: 20, left: 20 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" tick={{ fontSize: 11 }} />
          <YAxis
            yAxisId="left"
            orientation="left"
            tick={{ fontSize: 11 }}
            label={{ value: "テスト消化残", angle: -90, position: "insideLeft", style: { fontSize: 12 } }}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            tick={{ fontSize: 11 }}
            label={{ value: "バグ検出累計", angle: 90, position: "insideRight", style: { fontSize: 12 } }}
          />
          <Tooltip />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="remaining"
            name="テスト消化残"
            stroke="#3b82f6"
            strokeWidth={2}
            dot={{ r: 3 }}
          />
          {chartData.some((d) => d.plannedRemaining !== undefined) && (
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="plannedRemaining"
              name="目標線"
              stroke="#94a3b8"
              strokeWidth={1}
              strokeDasharray="5 5"
              dot={false}
            />
          )}
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="bugCumulative"
            name="バグ検出累計"
            stroke="#ef4444"
            strokeWidth={2}
            dot={{ r: 3 }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
