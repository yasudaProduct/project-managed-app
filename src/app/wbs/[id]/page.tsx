import { Suspense } from "react";
import { notFound } from "next/navigation";
import { getWbsBuffers, getWbsById } from "@/app/wbs/[id]/wbs-actions";
import {
  BarChart3,
  CalendarCheck,
  CirclePlus,
  LayoutDashboard,
  List,
  Loader2,
  Table,
  Trello,
  Users,
  History,
} from "lucide-react";
import prisma from "@/lib/prisma";
import { getWbsPhases } from "./wbs-phase-actions";
import { getWbsAssignees } from "../assignee/assignee-actions";
import { getTaskAll } from "./wbs-task-actions";
import { TaskTableViewPage } from "@/components/wbs/task-table-view";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { TaskModal } from "@/components/wbs/task-modal";
import { ProjectInfoCard } from "@/components/wbs/project-info-card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import GanttV2Wrapper from "@/components/ganttv2/gantt-v2-wrapper";
import { getMilestones } from "./milestone-actions";
import MilestoneManagement from "@/components/milestone/milestone-management";
import { WbsSummaryTables } from "@/components/wbs/wbs-summary-tables";

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

  const [tasks, buffers, phases, assignees, milestones] = await Promise.all([
    getTaskAll(wbs.id),
    getWbsBuffers(wbs.id),
    getWbsPhases(wbs.id),
    getWbsAssignees(wbs.id),
    getMilestones(wbs.id),
  ]);

  return (
    <>
      <div className="container mx-auto">
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
        <Suspense
          fallback={
            <div className="flex justify-center">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          }
        >
          <Tabs defaultValue="summary" className="w-full mt-4">
            <TabsList className="grid w-full grid-cols-6">
              <TabsTrigger
                value="summary"
                className="flex items-center gap-2 w-full justify-center"
              >
                <LayoutDashboard className="h-4 w-4" />
                ダッシュボード
              </TabsTrigger>
              <TabsTrigger
                value="list"
                className="flex items-center gap-2 w-full justify-center"
              >
                <List className="h-4 w-4" />
                タスク一覧
              </TabsTrigger>
              <TabsTrigger
                value="gantt"
                className="flex items-center gap-2 w-full justify-center"
              >
                <BarChart3 className="h-4 w-4" />
                ガントチャート
              </TabsTrigger>
              <TabsTrigger
                value="milestone"
                className="flex items-center gap-2 w-full justify-center"
              >
                <CalendarCheck className="h-4 w-4" />
                マイルストーン
              </TabsTrigger>
              <TabsTrigger
                value="table"
                className="flex items-center gap-2 w-full justify-center"
              >
                <Table className="h-4 w-4" />
                集計表
              </TabsTrigger>
              <TabsTrigger
                value="history"
                className="flex items-center gap-2 w-full justify-center"
                asChild
              >
                <Link href={`/wbs/${id}/history`}>
                  <History className="h-4 w-4" />
                  進捗履歴
                </Link>
              </TabsTrigger>
            </TabsList>
            <TabsContent value="summary">
              <ProjectInfoCard
                project={project}
                phases={phases}
                assignees={assignees || []}
                buffers={buffers}
              />
            </TabsContent>
            <TabsContent value="list">
              <TaskTableViewPage wbsTasks={tasks} />
            </TabsContent>
            <TabsContent value="gantt">
              <GanttV2Wrapper
                tasks={tasks}
                milestones={milestones}
                wbsId={wbs.id}
                project={{
                  id: project!.id,
                  name: project?.name ?? "",
                  status: project!.status,
                  startDate: project!.startDate,
                  endDate: project!.endDate,
                }}
              />
            </TabsContent>
            <TabsContent value="milestone">
              <MilestoneManagement
                wbsId={wbs.id}
                initialMilestones={milestones}
              />
            </TabsContent>
            <TabsContent value="table">
              <WbsSummaryTables projectId={project.id} wbsId={String(wbs.id)} />
            </TabsContent>
          </Tabs>
        </Suspense>
      </div>
    </>
  );
}
