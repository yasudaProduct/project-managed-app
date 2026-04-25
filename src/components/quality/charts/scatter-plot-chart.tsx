"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceArea,
  ResponsiveContainer,
  Label,
} from "recharts";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getScatterData } from "@/app/wbs/[id]/actions/quality-actions";
import type { ScatterResult } from "@/applications/quality/quality-chart.service";
import type { IpaMetricKey } from "@/domains/quality/value-objects/metric-definition";
import { IPA_METRIC_DEFINITIONS } from "@/domains/quality/value-objects/metric-definition";
import type { QualitySizeUnit } from "@/domains/quality/value-objects/quality-enums";
import type { AggregationType } from "@/domains/quality/services/scatter-plot-analyzer";

interface Props {
  wbsId: number;
  sizeUnit: QualitySizeUnit;
}

const metricOptions = Object.values(IPA_METRIC_DEFINITIONS).map((d) => ({
  value: d.key,
  label: d.label,
}));

const aggregationOptions: { value: AggregationType; label: string }[] = [
  { value: "none", label: "タスク別" },
  { value: "subsystem", label: "サブシステム別" },
  { value: "featureGroup", label: "機能グループ別" },
];

export function ScatterPlotChart({ wbsId, sizeUnit }: Props) {
  const [xMetric, setXMetric] = useState<IpaMetricKey>("testDensity");
  const [yMetric, setYMetric] = useState<IpaMetricKey>("bugDensity");
  const [aggregation, setAggregation] = useState<AggregationType>("none");
  const [data, setData] = useState<ScatterResult | null>(null);

  const fetchData = useCallback(async () => {
    const result = await getScatterData(wbsId, sizeUnit, xMetric, yMetric, aggregation);
    setData(result);
  }, [wbsId, sizeUnit, xMetric, yMetric, aggregation]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const xLabel = IPA_METRIC_DEFINITIONS[xMetric].label;
  const yLabel = IPA_METRIC_DEFINITIONS[yMetric].label;

  return (
    <div className="space-y-3">
      <div className="flex gap-2 flex-wrap items-center">
        <div className="flex items-center gap-1">
          <span className="text-xs text-muted-foreground">X軸:</span>
          <Select value={xMetric} onValueChange={(v) => setXMetric(v as IpaMetricKey)}>
            <SelectTrigger className="w-[160px] h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {metricOptions.map((o) => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-xs text-muted-foreground">Y軸:</span>
          <Select value={yMetric} onValueChange={(v) => setYMetric(v as IpaMetricKey)}>
            <SelectTrigger className="w-[160px] h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {metricOptions.map((o) => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-xs text-muted-foreground">集約:</span>
          <Select value={aggregation} onValueChange={(v) => setAggregation(v as AggregationType)}>
            <SelectTrigger className="w-[140px] h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {aggregationOptions.map((o) => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={300}>
        <ScatterChart margin={{ top: 10, right: 10, bottom: 20, left: 20 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis type="number" dataKey="x" name={xLabel}>
            <Label value={xLabel} offset={-10} position="insideBottom" style={{ fontSize: 12 }} />
          </XAxis>
          <YAxis type="number" dataKey="y" name={yLabel}>
            <Label value={yLabel} angle={-90} position="insideLeft" style={{ fontSize: 12 }} />
          </YAxis>
          <Tooltip
            formatter={(value: number) => value.toFixed(3)}
          />
          {data?.xThreshold && data?.yThreshold && (
            <ReferenceArea
              x1={data.xThreshold.lowerLimit}
              x2={data.xThreshold.upperLimit}
              y1={data.yThreshold.lowerLimit}
              y2={data.yThreshold.upperLimit}
              fill="#22c55e"
              fillOpacity={0.1}
              stroke="#22c55e"
              strokeDasharray="3 3"
            />
          )}
          <Scatter
            data={data?.points ?? []}
            fill="#3b82f6"
            shape="circle"
          />
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
}
