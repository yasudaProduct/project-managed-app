import { Suspense } from "react";
import { notFound } from "next/navigation";
import { getWbsById } from "@/app/wbs/[id]/wbs-actions";
import { Loader2 } from "lucide-react";
import WbsManagementTable from "@/components/wbs/data-management-table";
import prisma from "@/lib/prisma";
import { formatDateyyyymmdd } from "@/lib/utils";
import { getWbsPhases } from "./wbs-phase-actions";
import { getWbsAssignees } from "../assignee/assignee-actions";

export default async function WbsManagementPage({
  params,
}: {
  params: Promise<{ id: number }>;
}) {
  const { id } = await params;

  const wbs = await getWbsById(id);
  if (!wbs) {
    notFound();
  }

  const project = await prisma.projects.findUnique({
    where: {
      id: wbs.projectId,
    },
  });
  if (!project) {
    notFound();
  }

  const tasks = await prisma.wbsTask.findMany({
    where: {
      wbsId: wbs.id,
    },
    include: {
      assignee: {
        select: {
          id: true,
          name: true,
          displayName: true,
        },
      },
      phase: {
        select: {
          id: true,
          name: true,
          seq: true,
        },
      },
    },
    orderBy: {
      id: "asc",
    },
  });

  const formattedTasks = tasks.map((task) => ({
    ...task,
    kijunStartDate: task.kijunStartDate
      ? task.kijunStartDate.toISOString()
      : "",
    kijunEndDate: task.kijunEndDate ? task.kijunEndDate.toISOString() : "",
    kijunKosu: task.kijunKosu || 0,
    yoteiStartDate: task.yoteiStartDate
      ? task.yoteiStartDate.toISOString()
      : "",
    yoteiEndDate: task.yoteiEndDate ? task.yoteiEndDate.toISOString() : "",
    yoteiKosu: task.yoteiKosu || 0,
    jissekiStartDate: task.jissekiStartDate
      ? task.jissekiStartDate.toISOString()
      : "",
    jissekiEndDate: task.jissekiEndDate
      ? task.jissekiEndDate.toISOString()
      : "",
    jissekiKosu: task.jissekiKosu || 0,
    status: task.status,
    assigneeId: task.assigneeId || "",
    assignee: task.assignee || undefined,
    displayName: task.assignee?.displayName || "",
    phaseId: task.phaseId || 0,
    phase: {
      id: task.phase?.id || 0,
      name: task.phase?.name || "",
      seq: task.phase?.seq || 0,
    },
  }));

  const phases = await getWbsPhases(wbs.id);

  const assignees = await getWbsAssignees(wbs.id);

  return (
    <div className="container mx-auto py-2">
      <div className="flex justify-between items-center mb-2">
        <h1 className="text-3xl font-bold">WBS: {wbs.name}</h1>
      </div>
      <p className="text-sm text-gray-500">{project.description}</p>
      <p className="text-sm text-gray-500">
        プロジェクト状況:{getProjectStatusInJapanese(project.status)}
      </p>
      <p className="text-sm text-gray-500">
        プロジェクト期間:{formatDateyyyymmdd(project.startDate.toISOString())}~
        {formatDateyyyymmdd(project.endDate.toISOString())}
      </p>
      <p className="text-sm text-gray-500">
        工程：{phases.map((phase) => phase.name).join(", ")}
      </p>
      <p className="text-sm text-gray-500">
        担当者：
        {assignees.map((assignee) => assignee.assignee.displayName).join(", ")}
      </p>
      <Suspense
        fallback={
          <div className="flex justify-center">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        }
      >
        <WbsManagementTable wbsId={wbs.id} wbsTasks={formattedTasks} />
      </Suspense>
    </div>
  );
}
