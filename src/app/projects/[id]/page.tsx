import { Suspense } from "react";
import { notFound } from "next/navigation";
import { getProjectById } from "../actions";
import { getLatestWbsByProjectId } from "./wbs/wbs-actions";
import { getWbsBuffers } from "@/app/wbs/[id]/actions/wbs-actions";
import { getWbsPhases } from "@/app/wbs/[id]/actions/wbs-phase-actions";
import { getWbsAssignees } from "@/app/wbs/assignee/assignee-actions";
import { getTaskAll } from "@/app/wbs/[id]/actions/wbs-task-actions";
import { getMilestones } from "@/app/wbs/[id]/actions/milestone-actions";
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
  ArrowLeft,
  Edit,
  TrendingUp,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { TaskModal } from "@/components/wbs/task-modal";
import { Settings } from "lucide-react";
import { ProjectSettings } from "@/components/wbs/project-settings";
import { TaskDependencyModal } from "@/components/wbs/task-dependency-modal";
import { ProjectInfoCard } from "@/components/wbs/project-info-card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import GanttV2Wrapper from "@/components/ganttv2/gantt-v2-wrapper";
import MilestoneManagement from "@/components/milestone/milestone-management";
import { WbsSummaryTables } from "@/components/wbs/wbs-summary-tables";
import { AssigneeGanttChart } from "@/app/wbs/[id]/assignee-gantt/assignee-gantt-chart";
import WbsImportJobButtons from "@/components/wbs/wbs-import-job-buttons";
import { TaskTableViewPage } from "@/components/wbs/task-table-view";
import { Badge } from "@/components/ui/badge";
import { getProjectStatusName } from "@/utils/utils";
import { EvmDashboard } from "@/components/evm/evm-dashboard";

export default async function ProjectPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { id: projectId } = await params;
  const { tab } = await searchParams;

  const project = await getProjectById(projectId);
  if (!project) {
    notFound();
  }

  // プロジェクトに対する最新のWBSを取得
  const latestWbs = await getLatestWbsByProjectId(projectId);
  if (!latestWbs) {
    // WBSが存在しない場合は、プロジェクトの基本情報のみ表示
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Link
              href="/projects"
              className="text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <span className="text-muted-foreground">/</span>
            <Link
              href="/projects"
              className="text-muted-foreground hover:text-foreground"
            >
              プロジェクト一覧
            </Link>
            <span className="text-muted-foreground">/</span>
            <span className="font-medium">{project.name}</span>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold">{project.name}</h1>
              <Badge
                variant={project.status === "ACTIVE" ? "default" : "secondary"}
                className="text-xs"
              >
                {getProjectStatusName(project.status)}
              </Badge>
            </div>

            <div className="flex flex-wrap gap-2">
              <Link href={`/projects/${project.id}/edit`}>
                <Button size="sm" className="gap-2">
                  <Edit className="h-4 w-4" />
                  編集
                </Button>
              </Link>
            </div>
          </div>
        </div>

        <div className="text-center py-8">
          <p className="text-muted-foreground">
            このプロジェクトにはまだWBSが作成されていません。
          </p>
        </div>
      </div>
    );
  }

  // WBS関連のデータを取得
  const [tasks, buffers, phases, assignees, milestones] = await Promise.all([
    getTaskAll(latestWbs.id),
    getWbsBuffers(latestWbs.id),
    getWbsPhases(latestWbs.id),
    getWbsAssignees(latestWbs.id),
    getMilestones(latestWbs.id),
  ]);

  return (
    <>
      <div className="container mx-auto mt-2">
        {/* パンくずリスト */}
        <div className="flex items-center gap-2 mb-4">
          <Link
            href="/projects"
            className="text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <span className="text-muted-foreground">/</span>
          <Link
            href="/projects"
            className="text-muted-foreground hover:text-foreground"
          >
            プロジェクト一覧
          </Link>
          <span className="text-muted-foreground">/</span>
          <span className="font-medium">{project.name}</span>
        </div>

        {/* ヘッダー */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold">{project.name}</h1>
            <Badge
              variant={project.status === "ACTIVE" ? "default" : "secondary"}
              className="text-xs"
            >
              {getProjectStatusName(project.status)}
            </Badge>
          </div>

          <Link href={`/projects/${project.id}/edit`}>
            <Button size="sm" className="gap-2">
              <Edit className="h-4 w-4" />
              プロジェクト編集
            </Button>
          </Link>
        </div>

        {/* ヘッダメニュー */}
        <div className="mt-2 flex flex-row items-center">
          <Link href={`/wbs/${latestWbs.id}/phase/new`}>
            <Button className="bg-white text-black">
              <CirclePlus className="h-4 w-4" />
              <Trello className="h-4 w-4" />
            </Button>
          </Link>
          <Link href={`/wbs/${latestWbs.id}/phase`}>
            <Button className="bg-white text-black ml-2">
              <Trello className="h-4 w-4" />
            </Button>
          </Link>
          <Link href={`/wbs/${latestWbs.id}/assignee/new`}>
            <Button className="bg-white text-black ml-2">
              <CirclePlus className="h-4 w-4" />
              <Users className="h-4 w-4" />
            </Button>
          </Link>
          <Link href={`/wbs/${latestWbs.id}/assignee`}>
            <Button className="bg-white text-black ml-2">
              <Users className="h-4 w-4" />
            </Button>
          </Link>
          <TaskModal wbsId={latestWbs.id}>
            <Button className="bg-white text-black ml-2 mr-2">
              <CirclePlus className="h-4 w-4" />
              <CalendarCheck className="h-4 w-4" />
            </Button>
          </TaskModal>
          <TaskDependencyModal
            wbsId={latestWbs.id}
            tasks={tasks.map((task) => ({
              id: task.id,
              taskNo: task.taskNo || "",
              name: task.name,
            }))}
          />
          <WbsImportJobButtons wbsId={latestWbs.id} wbsName={latestWbs.name} />
          <Link href={`/wbs/${latestWbs.id}/task-scheduling`}>
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
              <TabsTrigger value="evm" className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
              </TabsTrigger>
              <TabsTrigger value="settings" className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
              </TabsTrigger>
            </TabsList>
            <TabsContent value="summary">
              <ProjectInfoCard
                project={{
                  description: project.description ?? null,
                  status: project.status,
                  startDate: project.startDate,
                  endDate: project.endDate,
                }}
                phases={phases}
                assignees={assignees || []}
                buffers={buffers}
              />
            </TabsContent>
            <TabsContent value="settings">
              <ProjectSettings projectId={project.id} />
            </TabsContent>
            <TabsContent value="list">
              <TaskTableViewPage wbsTasks={tasks} wbsId={latestWbs.id} />
            </TabsContent>
            <TabsContent value="gantt">
              <GanttV2Wrapper
                tasks={tasks}
                milestones={milestones}
                wbsId={latestWbs.id}
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
                wbsId={latestWbs.id}
                initialMilestones={milestones}
              />
            </TabsContent>
            <TabsContent value="table">
              <WbsSummaryTables projectId={project.id} wbsId={latestWbs.id} />
            </TabsContent>
            <TabsContent value="assignee-gantt">
              <AssigneeGanttChart wbsId={latestWbs.id} />
            </TabsContent>
            <TabsContent value="evm">
              <EvmDashboard wbsId={latestWbs.id} />
            </TabsContent>
          </Tabs>
        </Suspense>
      </div>
    </>
  );
}
