"use client";

import type { WbsQualitySummary } from "@/applications/quality/quality-application.service";
import { getMetricDefinitions, shouldShowReviewCompletionRate } from "@/domains/quality/value-objects/metric-definition";

interface QualityIndicatorCardsProps {
  summary: WbsQualitySummary;
}

function formatDensity(
  value: number | null,
  def: { scaleFactor: number; unitSuffix: string },
): string {
  if (value === null) return "-";
  const scaled = def.scaleFactor !== 1 ? value : value;
  return `${scaled.toFixed(3)} ${def.unitSuffix}`;
}

function formatPercent(value: number | null): string {
  if (value === null) return "-";
  return `${(value * 100).toFixed(1)}%`;
}

export function QualityIndicatorCards({ summary }: QualityIndicatorCardsProps) {
  const definitions = getMetricDefinitions(summary.sizeUnit);

  const items = definitions.map((def) => {
    const indicator = summary.metrics[def.key];
    return {
      label: def.label,
      value: formatDensity(indicator?.value ?? null, def),
      hint: def.numerator.source === 'reviewManHours'
        ? `${summary.totalReviewManHours.toFixed(1)}h / ${summary.totalSize.toFixed(1)}`
        : `${summary.totalFindingCount}件 / ${summary.totalSize.toFixed(1)}`,
    };
  });

  if (shouldShowReviewCompletionRate(summary.sizeUnit) && summary.reviewCompletionRate) {
    items.push({
      label: "レビュー実施率",
      value: formatPercent(summary.reviewCompletionRate.value),
      hint: `${summary.reviewedTargetCount} / ${summary.targetCount} 対象`,
    });
  }

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
