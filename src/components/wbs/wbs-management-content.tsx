import { Suspense } from "react";
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
  Settings,
  TrendingUp,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { TaskModal } from "@/components/wbs/task-modal";
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
import { EvmDashboard } from "@/components/evm/evm-dashboard";
import { WbsTagInput } from "@/components/wbs/wbs-tag-input";
import type { ProjectStatus, WbsTask, Milestone } from "@/types/wbs";
import type { ProgressMeasurementMethod } from "@/types/progress-measurement";

type WbsManagementContentProps = {
  wbsId: number;
  wbsName: string;
  project: {
    id: string;
    name: string;
    description?: string | null;
    status: ProjectStatus;
    startDate: Date;
    endDate: Date;
  };
  tasks: WbsTask[];
  buffers: Array<{
    bufferType: string;
    buffer: number;
    name: string;
  }>;
  phases: Array<{ id: number; seq: number; name: string; code: string }>;
  assignees: Array<{ assignee: { displayName: string } | null }> | null;
  milestones: Milestone[];
  defaultTab?: string;
  showEvm?: boolean;
  showTags?: boolean;
  defaultProgressMethod?: ProgressMeasurementMethod;
};

export function WbsManagementContent({
  wbsId,
  wbsName,
  project,
  tasks,
  buffers,
  phases,
  assignees,
  milestones,
  defaultTab,
  showEvm = false,
  showTags = false,
  defaultProgressMethod,
}: WbsManagementContentProps) {
  return (
    <>
      {/* アクションメニュー */}
      <div className="mt-2 flex flex-row items-center">
        <Link href={`/wbs/${wbsId}/phase/new`}>
          <Button className="bg-white text-black">
            <CirclePlus className="h-4 w-4" />
            <Trello className="h-4 w-4" />
          </Button>
        </Link>
        <Link href={`/wbs/${wbsId}/phase`}>
          <Button className="bg-white text-black ml-2">
            <Trello className="h-4 w-4" />
          </Button>
        </Link>
        <Link href={`/wbs/${wbsId}/assignee/new`}>
          <Button className="bg-white text-black ml-2">
            <CirclePlus className="h-4 w-4" />
            <Users className="h-4 w-4" />
          </Button>
        </Link>
        <Link href={`/wbs/${wbsId}/assignee`}>
          <Button className="bg-white text-black ml-2">
            <Users className="h-4 w-4" />
          </Button>
        </Link>
        <TaskModal wbsId={wbsId}>
          <Button className="bg-white text-black ml-2 mr-2">
            <CirclePlus className="h-4 w-4" />
            <CalendarCheck className="h-4 w-4" />
          </Button>
        </TaskModal>
        <TaskDependencyModal
          wbsId={wbsId}
          tasks={tasks.map((task) => ({
            id: task.id,
            taskNo: task.taskNo || "",
            name: task.name,
          }))}
        />
        <WbsImportJobButtons wbsId={wbsId} wbsName={wbsName} />
        <Link href={`/wbs/${wbsId}/task-scheduling`}>
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
        <Tabs defaultValue={defaultTab || "summary"} className="mt-2">
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
            {showEvm && (
              <TabsTrigger value="evm" className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
              </TabsTrigger>
            )}
            <TabsTrigger value="settings" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
            </TabsTrigger>
          </TabsList>

          <TabsContent value="summary">
            <div className="space-y-4">
              {showTags && <WbsTagInput wbsId={wbsId} />}
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
            </div>
          </TabsContent>
          <TabsContent value="settings">
            <ProjectSettings projectId={project.id} />
          </TabsContent>
          <TabsContent value="list">
            <TaskTableViewPage wbsTasks={tasks} wbsId={wbsId} />
          </TabsContent>
          <TabsContent value="gantt">
            <GanttV2Wrapper
              tasks={tasks}
              milestones={milestones}
              wbsId={wbsId}
              project={{
                id: project.id,
                name: project.name,
                status: project.status,
                startDate: project.startDate,
                endDate: project.endDate,
              }}
            />
          </TabsContent>
          <TabsContent value="milestone">
            <MilestoneManagement
              wbsId={wbsId}
              initialMilestones={milestones}
            />
          </TabsContent>
          <TabsContent value="table">
            <WbsSummaryTables projectId={project.id} wbsId={wbsId} />
          </TabsContent>
          <TabsContent value="assignee-gantt">
            <AssigneeGanttChart wbsId={wbsId} />
          </TabsContent>
          {showEvm && (
            <TabsContent value="evm">
              <EvmDashboard
                wbsId={wbsId}
                defaultProgressMethod={defaultProgressMethod}
              />
            </TabsContent>
          )}
        </Tabs>
      </Suspense>
    </>
  );
}
