export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { CalendarCheck } from "lucide-react";
import { getProjectById } from "../../actions";
import { getLatestWbsByProjectId } from "@/app/wbs/[id]/actions/wbs-actions";
import { GanttV3Client } from "@/components/ganttv3/GanttV3Client";

export default async function ProjectGanttV3Page({
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

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      {/* ガントチャート */}
      {wbs ? (
        <div className="flex-1 overflow-hidden">
          <GanttV3Client wbsId={wbs.id} />
        </div>
      ) : (
        <div className="flex-1 flex justify-center items-center">
          <div className="text-center text-gray-500">
            <CalendarCheck className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p className="text-lg font-medium">WBSがありません</p>
            <p className="text-sm mt-2">プロジェクトにWBSを作成してください</p>
          </div>
        </div>
      )}
    </div>
  );
}
