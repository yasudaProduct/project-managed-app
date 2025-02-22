import { Suspense } from "react";
import { notFound } from "next/navigation";
import { getWbsBuffers, getWbsById } from "@/app/wbs/[id]/wbs-actions";
import {
  CalendarCheck,
  CirclePlus,
  Loader2,
  Trello,
  Users,
} from "lucide-react";
import prisma from "@/lib/prisma";
import { formatDateyyyymmdd, getProjectStatusName } from "@/lib/utils";
import { getWbsPhases } from "./wbs-phase-actions";
import { getWbsAssignees } from "../assignee/assignee-actions";
import WbsSummaryCard from "@/components/wbs/wbs-summary-card";
import { getTaskAll } from "./wbs-task-actions";
import { TaskTableViewPage } from "@/components/wbs/task-table-view";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { TaskModal } from "@/components/wbs/task-modal";
import { WbsTask } from "@/types/wbs";

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

  const tasks: WbsTask[] = await getTaskAll(wbs.id);

  const buffers = await getWbsBuffers(wbs.id);

  const phases = await getWbsPhases(wbs.id);

  const assignees = await getWbsAssignees(wbs.id);

  return (
    <>
      <div className="container mx-auto">
        <div className="flex justify-between items-center mb-2">
          <h1 className="text-3xl font-bold">WBS: {wbs.name}</h1>
        </div>
        <p className="text-sm text-gray-500">{project.description}</p>
        <p className="text-sm text-gray-500">
          プロジェクト状況:{getProjectStatusName(project.status)}
        </p>
        <p className="text-sm text-gray-500">
          プロジェクト期間:{formatDateyyyymmdd(project.startDate.toISOString())}
          ~{formatDateyyyymmdd(project.endDate.toISOString())}
        </p>
        <p className="text-sm text-gray-500">
          工程：{phases.map((phase) => phase.name).join(", ")}
        </p>
        <p className="text-sm text-gray-500">
          担当者：
          {assignees
            .map((assignee) => assignee.assignee.displayName)
            .join(", ")}
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
          <Link href={`/wbs/${wbs.id}/phase/new`}>
            <Button className="bg-white text-black">
              <CirclePlus className="h-4 w-4" />
              <Trello className="h-4 w-4" />
            </Button>
          </Link>
          <Link href={`/wbs/${wbs.id}/phase`}>
            <Button className="bg-white text-black ml-2">
              <Trello className="h-4 w-4" />
            </Button>
          </Link>
          <Link href={`/wbs/${wbs.id}/assignee/new`}>
            <Button className="bg-white text-black ml-2">
              <CirclePlus className="h-4 w-4" />
              <Users className="h-4 w-4" />
            </Button>
          </Link>
          <Link href={`/wbs/${wbs.id}/assignee`}>
            <Button className="bg-white text-black ml-2">
              <Users className="h-4 w-4" />
            </Button>
          </Link>
          <TaskModal wbsId={wbs.id}>
            <Button className="bg-white text-black ml-2">
              <CirclePlus className="h-4 w-4" />
              <CalendarCheck className="h-4 w-4" />
            </Button>
          </TaskModal>
          <TaskTableViewPage wbsTasks={tasks} />
        </Suspense>
      </div>
    </>
  );
}
