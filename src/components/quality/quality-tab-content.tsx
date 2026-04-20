import {
  getQualityTargets,
  getQualityThresholds,
  getWbsQualitySummary,
  getQualityTrend,
  getWbsAllFindings,
} from "@/app/wbs/[id]/actions/quality-actions";
import { QualityDashboard } from "@/components/quality/quality-dashboard";

interface QualityTabContentProps {
  wbsId: number;
  projectId: string;
}

export async function QualityTabContent({
  wbsId,
  projectId,
}: QualityTabContentProps) {
  const [targets, thresholds] = await Promise.all([
    getQualityTargets(wbsId),
    getQualityThresholds(projectId),
  ]);

  const [initialSummary, initialTrend, initialFindings] = await Promise.all([
    getWbsQualitySummary(wbsId, "MAN_HOUR", thresholds),
    getQualityTrend(wbsId, "MAN_HOUR"),
    getWbsAllFindings(wbsId),
  ]);

  return (
    <QualityDashboard
      wbsId={wbsId}
      projectId={projectId}
      initialTargets={targets}
      initialThresholds={thresholds}
      initialSummary={initialSummary}
      initialTrend={initialTrend}
      initialFindings={initialFindings}
    />
  );
}
