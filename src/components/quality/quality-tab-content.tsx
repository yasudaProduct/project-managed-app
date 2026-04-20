import {
  getQualityTargets,
  getWbsQualitySummary,
  getQualityTrend,
  getWbsAllFindings,
  getQualityFindingsByReviewee,
  getQualityFindingsByCategory,
} from "@/app/wbs/[id]/actions/quality-actions";
import { QualityDashboard } from "@/components/quality/quality-dashboard";

interface QualityTabContentProps {
  wbsId: number;
}

export async function QualityTabContent({
  wbsId,
}: QualityTabContentProps) {
  const [
    targets,
    initialSummary,
    initialTrend,
    initialFindings,
    initialRevieweeFindings,
    initialCategoryFindings,
  ] = await Promise.all([
    getQualityTargets(wbsId, "MAN_HOUR"),
    getWbsQualitySummary(wbsId, "MAN_HOUR"),
    getQualityTrend(wbsId, "MAN_HOUR"),
    getWbsAllFindings(wbsId),
    getQualityFindingsByReviewee(wbsId),
    getQualityFindingsByCategory(wbsId),
  ]);

  return (
    <QualityDashboard
      wbsId={wbsId}
      initialTargets={targets}
      initialSummary={initialSummary}
      initialTrend={initialTrend}
      initialFindings={initialFindings}
      initialRevieweeFindings={initialRevieweeFindings}
      initialCategoryFindings={initialCategoryFindings}
    />
  );
}
