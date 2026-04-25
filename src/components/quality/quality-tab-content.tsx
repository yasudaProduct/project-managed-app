import {
  getQualityTargets,
  getWbsQualitySummary,
  getWbsAllFindings,
} from "@/app/wbs/[id]/actions/quality-actions";
import { QualitySizeUnit } from "@/domains/quality/value-objects/quality-enums";
import { QualityDashboard } from "@/components/quality/quality-dashboard";

interface QualityTabContentProps {
  wbsId: number;
}

export async function QualityTabContent({
  wbsId,
}: QualityTabContentProps) {
  const defaultUnit = QualitySizeUnit.PAGE;

  const [targets, initialSummary, initialFindings] = await Promise.all([
    getQualityTargets(wbsId, defaultUnit, true),
    getWbsQualitySummary(wbsId, defaultUnit),
    getWbsAllFindings(wbsId),
  ]);

  return (
    <QualityDashboard
      wbsId={wbsId}
      initialTargets={targets}
      initialSummary={initialSummary}
      initialFindings={initialFindings}
    />
  );
}
