export const dynamic = 'force-dynamic';

import { notFound } from "next/navigation";
import { getWbsBuffers, getWbsById } from "@/app/wbs/[id]/actions/wbs-actions";
import { getProjectById } from "@/app/projects/actions";
import { getWbsPhases } from "./actions/wbs-phase-actions";
import { getWbsAssignees } from "../assignee/assignee-actions";
import { getTaskAll } from "./actions/wbs-task-actions";
import { getMilestones } from "./actions/milestone-actions";
import { listTaskDelays } from "./actions/task-delay-actions";
import { getDataFreshness } from "./actions/data-freshness-actions";
import { getPreviousReviewDate } from "./actions/progress-review-actions";
import { getProjectSettings } from "./project-settings-actions";
import { getWbsImportSchedule } from "./import-schedule-actions";
import { WbsManagementContent } from "@/components/wbs/wbs-management-content";

export default async function WbsManagementPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: number }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { id } = await params;
  const { tab } = await searchParams;

  const wbs = await getWbsById(id);
  if (!wbs) {
    notFound();
  }

  const project = await getProjectById(wbs.projectId);
  if (!project) {
    notFound();
  }

  const [tasks, buffers, phases, assignees, milestones, settings, importSchedule] =
    await Promise.all([
      getTaskAll(wbs.id),
      getWbsBuffers(wbs.id),
      getWbsPhases(wbs.id),
      getWbsAssignees(wbs.id),
      getMilestones(wbs.id),
      getProjectSettings(wbs.projectId),
      getWbsImportSchedule(wbs.id),
    ]);
  // 期限間近の日数・前回の確認日はプロジェクト設定に依存するため、設定の取得後に判定する
  const previousReviewDate = await getPreviousReviewDate(settings.progressReviewCycle);
  const [taskDelays, dataFreshness] = await Promise.all([
    listTaskDelays(wbs.id, settings.deadlineAlertDays, previousReviewDate ?? undefined),
    getDataFreshness(wbs.id, wbs.projectId),
  ]);

  return (
    <div className="container mx-auto mt-2">
      <WbsManagementContent
        wbsId={wbs.id}
        wbsName={wbs.name}
        project={project}
        tasks={tasks}
        buffers={buffers}
        phases={phases}
        assignees={assignees}
        milestones={milestones}
        taskDelays={taskDelays}
        dataFreshness={dataFreshness}
        previousReviewDate={previousReviewDate}
        importSchedule={importSchedule}
        defaultTab={tab}
        showEvm={true}
        showTags={true}
        defaultProgressMethod={settings.progressMeasurementMethod}
        defaultForecastMethod={settings.evmForecastMethod}
        progressReviewCycle={settings.progressReviewCycle}
        deadlineAlertDays={settings.deadlineAlertDays ?? 1}
        costOverrunThresholdPct={settings.costOverrunThresholdPct ?? 100}
      />
    </div>
  );
}
