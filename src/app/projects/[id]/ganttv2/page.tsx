export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { CalendarCheck } from "lucide-react";
import { Milestone, WbsTask } from "@/types/wbs";
import GanttV2Wrapper from "@/components/ganttv2/gantt-v2-wrapper";
import { getProjectById } from "../../actions";
import { getLatestWbsByProjectId } from "@/app/wbs/[id]/actions/wbs-actions";
import { getTaskAll } from "@/app/wbs/[id]/actions/wbs-task-actions";
import { getMilestones } from "@/app/wbs/[id]/actions/milestone-actions";

export default async function ProjectGanttV2Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: projectId } = await params;

  const project = await getProjectById(projectId);
  if (!project) {
    notFound();
  }

  const wbs = await getLatestWbsByProjectId(projectId);

  if (!wbs) {
    return (
      <div className="flex flex-col h-[calc(100vh-4rem)]">
        <div className="flex-1 flex justify-center items-center">
          <div className="text-center text-gray-500">
            <CalendarCheck className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p className="text-lg font-medium">WBSがありません</p>
            <p className="text-sm mt-2">プロジェクトにWBSを作成してください</p>
          </div>
        </div>
      </div>
    );
  }

  const wbsTasks: WbsTask[] = await getTaskAll(wbs.id);
  const milestones: Milestone[] = await getMilestones(wbs.id);

  return (
    <div className="container mx-auto py-6 space-y-6">
      {wbsTasks && wbsTasks.length > 0 ? (
        <GanttV2Wrapper
          tasks={wbsTasks}
          milestones={milestones}
          wbsId={wbs.id}
          project={{
            id: project.id,
            name: project.name ?? "",
            status: project.status,
            startDate: project.startDate,
            endDate: project.endDate,
          }}
        />
      ) : (
        <div className="w-full h-96 flex justify-center items-center">
          <div className="text-center text-gray-500">
            <CalendarCheck className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p className="text-lg font-medium">タスクがありません</p>
            <p className="text-sm mt-2">新しいタスクを作成してください</p>
          </div>
        </div>
      )}
    </div>
  );
}
