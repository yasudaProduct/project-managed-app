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
  Calendar,
} from "lucide-react";
import prisma from "@/lib/prisma";
import { getWbsPhases } from "./wbs-phase-actions";
import { getWbsAssignees } from "../assignee/assignee-actions";
import { getTaskAll } from "./wbs-task-actions";
import { TaskTableViewPage } from "@/components/wbs/task-table-view";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { TaskModal } from "@/components/wbs/task-modal";
import { Settings } from "lucide-react";
import { ProjectSettings } from "../../../components/wbs/project-settings";
import { TaskDependencyModal } from "@/components/wbs/task-dependency-modal";
import { ProjectInfoCard } from "@/components/wbs/project-info-card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import GanttV2Wrapper from "@/components/ganttv2/gantt-v2-wrapper";
import { getMilestones } from "./milestone-actions";
import MilestoneManagement from "@/components/milestone/milestone-management";
import { WbsSummaryTables } from "@/components/wbs/wbs-summary-tables";
import { AssigneeGanttChart } from "./assignee-gantt/assignee-gantt-chart";
import WbsImportJobButtons from "@/components/wbs/wbs-import-job-buttons";

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
      <div className="container mx-auto mt-2">
        {/* ヘッダメニュー */}
        <div className="mt-2 flex flex-row items-center">
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
            <Button className="bg-white text-black ml-2 mr-2">
              <CirclePlus className="h-4 w-4" />
              <CalendarCheck className="h-4 w-4" />
            </Button>
          </TaskModal>
          <TaskDependencyModal
            wbsId={wbs.id}
            tasks={tasks.map((task) => ({
              id: task.id,
              taskNo: task.taskNo || "",
              name: task.name,
            }))}
          />
          <WbsImportJobButtons wbsId={wbs.id} wbsName={wbs.name} />
          <Link href={`/wbs/${wbs.id}/task-scheduling`}>
            <Button className="bg-white text-black ml-2">
              <Calendar className="h-4 w-4" />
              スケジュール計算
            </Button>
          </Link>
        </div>
        <Suspense
          fallback={
            <div className="flex justify-center">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          }
        >
          {/* タブ */}
          <Tabs defaultValue={tab || "summary"} className="mt-2">
            <TabsList className="flex flex-row justify-start gap-2 border-b-2 border-gray-200">
              <TabsTrigger value="summary" className="flex items-center gap-2">
                <LayoutDashboard className="h-4 w-4" />
              </TabsTrigger>
              <TabsTrigger value="list" className="flex items-center gap-2">
                <List className="h-4 w-4" />
              </TabsTrigger>
              <TabsTrigger value="gantt" className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
              </TabsTrigger>
              <TabsTrigger
                value="milestone"
                className="flex items-center gap-2"
              >
                <CalendarCheck className="h-4 w-4" />
              </TabsTrigger>
              <TabsTrigger value="table" className="flex items-center gap-2">
                <Table className="h-4 w-4" />
              </TabsTrigger>
              <TabsTrigger
                value="assignee-gantt"
                className="flex items-center gap-2"
              >
                <Users className="h-4 w-4" />
              </TabsTrigger>
              <TabsTrigger value="settings" className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
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
            <TabsContent value="settings">
              <ProjectSettings projectId={project.id} />
            </TabsContent>
            <TabsContent value="list">
              <TaskTableViewPage wbsTasks={tasks} wbsId={wbs.id} />
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
              <WbsSummaryTables projectId={project.id} wbsId={wbs.id} />
            </TabsContent>
            <TabsContent value="assignee-gantt">
              <AssigneeGanttChart wbsId={wbs.id} />
            </TabsContent>
          </Tabs>
        </Suspense>
      </div>
    </>
  );
}
