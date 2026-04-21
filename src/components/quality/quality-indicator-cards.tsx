"use client";

import type { WbsQualitySummary } from "@/applications/quality/quality-application.service";
import { QualitySizeUnit } from "@/domains/quality/value-objects/quality-enums";

interface QualityIndicatorCardsProps {
  summary: WbsQualitySummary;
}

const DENSITY_SUFFIX: Record<QualitySizeUnit | "MAN_HOUR", string> = {
  MAN_HOUR: "/h",
  [QualitySizeUnit.PAGE]: "/page",
  [QualitySizeUnit.LINES_OF_CODE]: "/KLOC",
  [QualitySizeUnit.TEST_CASE]: "/TC",
};

function formatDensity(
  value: number | null,
  sizeUnit: QualitySizeUnit | "MAN_HOUR",
): string {
  if (value === null) return "-";
  const suffix = DENSITY_SUFFIX[sizeUnit];
  const scaled = sizeUnit === QualitySizeUnit.LINES_OF_CODE ? value * 1000 : value;
  return `${scaled.toFixed(3)} ${suffix}`;
}

function formatPercent(value: number | null): string {
  if (value === null) return "-";
  return `${(value * 100).toFixed(1)}%`;
}

export function QualityIndicatorCards({ summary }: QualityIndicatorCardsProps) {
  const items = [
    {
      label: "レビュー密度",
      value: formatDensity(summary.reviewDensity.value, summary.sizeUnit),
      hint: `${summary.totalReviewManHours.toFixed(1)}h / ${summary.totalSize.toFixed(1)}`,
    },
    {
      label: "指摘密度",
      value: formatDensity(summary.defectDensity.value, summary.sizeUnit),
      hint: `${summary.totalFindingCount}件 / ${summary.totalSize.toFixed(1)}`,
    },
    {
      label: "レビュー実施率",
      value: formatPercent(summary.reviewCompletionRate.value),
      hint: `${summary.reviewedTargetCount} / ${summary.targetCount} 対象`,
    },
  ];

  return (
    <div className="flex flex-wrap gap-6 px-1 py-2 border-b border-gray-100">
      {items.map((item) => (
        <div key={item.label} className="flex items-center gap-2 min-w-0">
          <span className="text-xs text-gray-500 whitespace-nowrap">{item.label}</span>
          <span className="text-sm font-semibold whitespace-nowrap text-gray-700">
            {item.value}
          </span>
          <span className="text-xs text-gray-400 whitespace-nowrap">({item.hint})</span>
        </div>
      ))}
    </div>
  );
}
