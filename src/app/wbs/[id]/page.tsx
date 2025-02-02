import { Suspense } from "react";
import { notFound } from "next/navigation";
import { getWbsBuffers, getWbsById } from "@/app/wbs/[id]/wbs-actions";
import { Loader2 } from "lucide-react";
import WbsManagementTable from "@/components/wbs/data-management-table";
import prisma from "@/lib/prisma";
import { formatDateyyyymmdd, getProjectStatusName } from "@/lib/utils";
import { getWbsPhases } from "./wbs-phase-actions";
import { getWbsAssignees } from "../assignee/assignee-actions";
import WbsSummaryCard from "@/components/wbs/wbs-summary-card";
import { getTaskAll } from "./wbs-task-actions";

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

  const tasks = await getTaskAll(wbs.id);

  const buffers = await getWbsBuffers(wbs.id);

  const phases = await getWbsPhases(wbs.id);

  const assignees = await getWbsAssignees(wbs.id);

  return (
    <div className="container mx-auto">
      <div className="flex justify-between items-center mb-2">
        <h1 className="text-3xl font-bold">WBS: {wbs.name}</h1>
      </div>
      <p className="text-sm text-gray-500">{project.description}</p>
      <p className="text-sm text-gray-500">
        プロジェクト状況:{getProjectStatusName(project.status)}
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
      <p className="text-sm text-gray-500">
        バッファ：
        {buffers
          .map(
            (buffer) =>
              buffer.bufferType +
              ":" +
              buffer.buffer +
              "  (" +
              buffer.name +
              ")"
          )
          .join(", ")}
      </p>
      <WbsSummaryCard wbsId={wbs.id} wbsTasks={tasks} />
      <Suspense
        fallback={
          <div className="flex justify-center">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        }
      >
        <WbsManagementTable wbsId={wbs.id} wbsTasks={tasks} />
      </Suspense>
    </div>
  );
}
