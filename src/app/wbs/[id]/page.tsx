import { Suspense } from "react";
import { notFound } from "next/navigation";
import { getWbsById } from "@/app/wbs/[id]/wbs-actions";
// import { getWbsPhases } from "@/app/wbs/[id]/wbs-phase-actions";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import WbsManagementTable from "@/components/wbs/data-management-table";
import prisma from "@/lib/prisma";

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

  // const phases = await getWbsPhases(wbs.id);

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
  }));

  return (
    <div className="container mx-auto py-2">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">WBS: {wbs.name}</h1>
        <Link href={`/wbs/${wbs.id}/phase/new`}>
          <Button>新規フェーズ追加</Button>
        </Link>
      </div>
      <p>{project.status}</p>
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
