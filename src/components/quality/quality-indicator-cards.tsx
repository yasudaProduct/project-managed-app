"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { QualityStatus } from "@/domains/quality/value-objects/quality-status";
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

function statusBorderClass(status: QualityStatus | null): string {
  switch (status) {
    case QualityStatus.DANGER:
      return "border-l-4 border-l-red-500";
    case QualityStatus.WARNING:
      return "border-l-4 border-l-yellow-500";
    case QualityStatus.NORMAL:
      return "border-l-4 border-l-green-500";
    default:
      return "border-l-4 border-l-gray-200";
  }
}

function statusLabelClass(status: QualityStatus | null): string {
  switch (status) {
    case QualityStatus.DANGER:
      return "text-red-600";
    case QualityStatus.WARNING:
      return "text-yellow-600";
    case QualityStatus.NORMAL:
      return "text-green-600";
    default:
      return "text-gray-500";
  }
}

function statusLabel(status: QualityStatus | null): string {
  switch (status) {
    case QualityStatus.DANGER:
      return "危険";
    case QualityStatus.WARNING:
      return "警告";
    case QualityStatus.NORMAL:
      return "正常";
    default:
      return "-";
  }
}

function formatDensity(
  value: number | null,
  sizeUnit: QualitySizeUnit | "MAN_HOUR",
  digits = 3,
): string {
  if (value === null) return "-";
  const suffix = DENSITY_SUFFIX[sizeUnit];
  const scaled = sizeUnit === QualitySizeUnit.LINES_OF_CODE ? value * 1000 : value;
  return `${scaled.toFixed(digits)} ${suffix}`;
}

function formatPercent(value: number | null): string {
  if (value === null) return "-";
  return `${(value * 100).toFixed(1)} %`;
}

export function QualityIndicatorCards({ summary }: QualityIndicatorCardsProps) {
  const cards = [
    {
      title: "レビュー密度",
      value: formatDensity(summary.reviewDensity.value, summary.sizeUnit),
      status: summary.reviewDensity.status,
      hint: `レビュー工数 ${summary.totalReviewManHours.toFixed(1)}h / 規模 ${summary.totalSize.toFixed(1)}`,
    },
    {
      title: "指摘密度",
      value: formatDensity(summary.defectDensity.value, summary.sizeUnit),
      status: summary.defectDensity.status,
      hint: `指摘 ${summary.totalFindingCount}件 / 規模 ${summary.totalSize.toFixed(1)}`,
    },
    {
      title: "Major指摘密度",
      value: formatDensity(summary.majorDefectDensity.value, summary.sizeUnit),
      status: summary.majorDefectDensity.status,
      hint: `Major ${summary.totalMajorCount}件 / 規模 ${summary.totalSize.toFixed(1)}`,
    },
    {
      title: "レビュー実施率",
      value: formatPercent(summary.reviewCompletionRate.value),
      status: summary.reviewCompletionRate.status,
      hint: `${summary.reviewedTargetCount} / ${summary.targetCount} 対象`,
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((c) => (
        <Card key={c.title} className={statusBorderClass(c.status)}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-gray-600 flex items-center justify-between">
              <span>{c.title}</span>
              <span className={`text-xs ${statusLabelClass(c.status)}`}>
                {statusLabel(c.status)}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{c.value}</p>
            <p className="text-xs text-gray-500 mt-1">{c.hint}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
