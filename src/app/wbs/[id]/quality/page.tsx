import { notFound } from "next/navigation";
import { getWbsById } from "@/app/wbs/[id]/actions/wbs-actions";
import {
  getQualityTargets,
  getQualityThresholds,
  getWbsQualitySummary,
  getQualityTrend,
} from "@/app/wbs/[id]/actions/quality-actions";
import { QualityDashboard } from "@/components/quality/quality-dashboard";

export default async function QualityPage({
  params,
}: {
  params: Promise<{ id: number }>;
}) {
  const { id } = await params;

  const wbs = await getWbsById(Number(id));
  if (!wbs) {
    notFound();
  }

  const wbsId = Number(id);
  const [targets, thresholds] = await Promise.all([
    getQualityTargets(wbsId),
    getQualityThresholds(wbs.projectId),
  ]);

  const [initialSummary, initialTrend] = await Promise.all([
    getWbsQualitySummary(wbsId, "MAN_HOUR", thresholds),
    getQualityTrend(wbsId, "MAN_HOUR"),
  ]);

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">定量品質管理</h1>
          <p className="text-gray-600 mt-1">{wbs.name}</p>
        </div>
      </div>

      <QualityDashboard
        wbsId={wbsId}
        projectId={wbs.projectId}
        initialTargets={targets}
        initialThresholds={thresholds}
        initialSummary={initialSummary}
        initialTrend={initialTrend}
      />
    </div>
  );
}
