"use client";

import { Card, CardContent } from "@/components/ui/card";
import { IpaMetricKey, getSizeScaleFactor } from "@/domains/quality/value-objects/metric-definition";
import type { QualitySizeUnit } from "@/domains/quality/value-objects/quality-enums";
import type { WbsSummary } from "@/applications/quality/quality-metrics.service";

interface Props {
  summary: WbsSummary;
  sizeUnit: QualitySizeUnit;
  thresholds?: Record<string, { warnThreshold?: number; dangerThreshold?: number }>;
}

function getStatusColor(
  value: number | null,
  threshold?: { warnThreshold?: number; dangerThreshold?: number },
): string {
  if (value === null || !threshold) return "text-foreground";
  if (threshold.dangerThreshold !== undefined && value >= threshold.dangerThreshold) return "text-red-600";
  if (threshold.warnThreshold !== undefined && value >= threshold.warnThreshold) return "text-amber-600";
  return "text-green-600";
}

function formatValue(value: number | null): string {
  if (value === null) return "-";
  return value.toFixed(3);
}

function getUnitSuffix(sizeUnit: QualitySizeUnit): string {
  const scale = getSizeScaleFactor(sizeUnit);
  if (scale === 1000) return "/KLOC";
  return `/${sizeUnit}`;
}

export function QualityKpiCards({ summary, sizeUnit, thresholds }: Props) {
  const metrics = summary.totalMetrics;
  const unitSuffix = getUnitSuffix(sizeUnit);

  const cards: { key: IpaMetricKey; label: string; suffix: string }[] = [
    { key: "reviewFindingDensity", label: "レビュー指摘密度", suffix: unitSuffix },
    { key: "reviewEffortDensity", label: "レビュー工数密度", suffix: unitSuffix },
    { key: "reviewEfficiency", label: "レビュー指摘効率", suffix: "/h" },
    { key: "bugDensity", label: "バグ密度", suffix: unitSuffix },
    { key: "testDensity", label: "テスト密度", suffix: unitSuffix },
    { key: "testEfficiency", label: "テスト効率", suffix: "/TC" },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
      {cards.map(({ key, label, suffix }) => {
        const value = metrics[key];
        const threshold = thresholds?.[key];
        const colorClass = getStatusColor(value, threshold);

        return (
          <Card key={key} className="py-3">
            <CardContent className="p-3 pt-0">
              <p className="text-xs text-muted-foreground truncate">{label}</p>
              <p className={`text-lg font-bold ${colorClass}`}>
                {formatValue(value)}
                <span className="text-xs font-normal text-muted-foreground ml-1">{suffix}</span>
              </p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
