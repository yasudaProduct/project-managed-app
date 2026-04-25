"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getParetoData } from "@/app/wbs/[id]/actions/quality-actions";
import type { ParetoItem } from "@/domains/quality/services/pareto-analyzer";
import type { FindingGroupField } from "@/domains/quality/services/pareto-analyzer";

interface Props {
  wbsId: number;
}

const groupOptions: { value: FindingGroupField; label: string }[] = [
  { value: "causeType", label: "原因別" },
  { value: "phenomenonType", label: "事象別" },
  { value: "injectionPhase", label: "混入工程別" },
  { value: "category", label: "カテゴリ別" },
];

export function ParetoChart({ wbsId }: Props) {
  const [groupField, setGroupField] = useState<FindingGroupField>("causeType");
  const [data, setData] = useState<ParetoItem[]>([]);

  const fetchData = useCallback(async () => {
    const result = await getParetoData(wbsId, groupField);
    setData(result);
  }, [wbsId, groupField]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">分類軸:</span>
        <Select value={groupField} onValueChange={(v) => setGroupField(v as FindingGroupField)}>
          <SelectTrigger className="w-[140px] h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {groupOptions.map((o) => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <ResponsiveContainer width="100%" height={300}>
        <ComposedChart data={data} margin={{ top: 10, right: 10, bottom: 40, left: 20 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="category"
            tick={{ fontSize: 11 }}
            angle={-30}
            textAnchor="end"
            height={60}
          />
          <YAxis
            yAxisId="left"
            orientation="left"
            tick={{ fontSize: 11 }}
            label={{ value: "件数", angle: -90, position: "insideLeft", style: { fontSize: 12 } }}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            domain={[0, 100]}
            tick={{ fontSize: 11 }}
            label={{ value: "累積%", angle: 90, position: "insideRight", style: { fontSize: 12 } }}
          />
          <Tooltip
            formatter={(value: number, name: string) =>
              name === "累積%" ? `${value.toFixed(1)}%` : value
            }
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Bar
            yAxisId="left"
            dataKey="count"
            name="件数"
            fill="#3b82f6"
            radius={[4, 4, 0, 0]}
          />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="cumulativePercent"
            name="累積%"
            stroke="#ef4444"
            strokeWidth={2}
            dot={{ r: 3 }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
