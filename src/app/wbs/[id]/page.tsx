export const dynamic = 'force-dynamic';

import { notFound } from "next/navigation";
import { getWbsBuffers, getWbsById } from "@/app/wbs/[id]/actions/wbs-actions";
import { getProjectById } from "@/app/projects/actions";
import { getWbsPhases } from "./actions/wbs-phase-actions";
import { getWbsAssignees } from "../assignee/assignee-actions";
import { getTaskAll } from "./actions/wbs-task-actions";
import { getMilestones } from "./actions/milestone-actions";
import { getProjectSettings } from "./project-settings-actions";
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

  const [tasks, buffers, phases, assignees, milestones, settings] =
    await Promise.all([
      getTaskAll(wbs.id),
      getWbsBuffers(wbs.id),
      getWbsPhases(wbs.id),
      getWbsAssignees(wbs.id),
      getMilestones(wbs.id),
      getProjectSettings(wbs.projectId),
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
        defaultTab={tab}
        showEvm={true}
        showTags={true}
        defaultProgressMethod={settings.progressMeasurementMethod}
        defaultForecastMethod={settings.evmForecastMethod}
        deadlineAlertDays={settings.deadlineAlertDays ?? 1}
        costOverrunThresholdPct={settings.costOverrunThresholdPct ?? 100}
      />
    </div>
  );
}
