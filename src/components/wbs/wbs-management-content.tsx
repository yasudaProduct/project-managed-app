import { Suspense } from "react";
import {
  CalendarCheck,
  CirclePlus,
  History,
  LayoutDashboard,
  List,
  Loader2,
  Table,
  Trello,
  Users,
  Calendar,
  Settings,
  TrendingUp,
  Repeat,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { TaskModal } from "@/components/wbs/task-modal";
import { ProjectSettings } from "@/components/wbs/project-settings";
import { WbsImportScheduleSettings } from "@/components/wbs/wbs-import-schedule-settings";
import { ProjectInfoCard } from "@/components/wbs/project-info-card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import MilestoneManagement from "@/components/milestone/milestone-management";
import { WbsSummaryTables } from "@/components/wbs/wbs-summary-tables";
import { AssigneeGanttChart } from "@/app/wbs/[id]/assignee-gantt/assignee-gantt-chart";
import WbsImportJobButtons from "@/components/wbs/wbs-import-job-buttons";
import { TaskTableViewPage } from "@/components/wbs/task-table-view";
import { EvmDashboard } from "@/components/evm/evm-dashboard";
import { WbsTagInput } from "@/components/wbs/wbs-tag-input";
import { SchedulingWorkbench } from "@/components/task-scheduling/scheduling-workbench";
import type { ProjectStatus, WbsTask, Milestone } from "@/types/wbs";
import type { ProgressMeasurementMethod } from "@/types/progress-measurement";
import type { EvmForecastMethod } from "@/types/evm-forecast-method";
import type { ProgressReviewCycle } from "@/types/progress-review-cycle";
import type { TaskDelayDto } from "@/applications/task-delay/task-delay-application-service";
import type { DataFreshnessDto } from "@/applications/data-freshness/data-freshness-application-service";
import type { MilestoneForecastDto } from "@/applications/milestone/milestone-application-service";
import type { EvmTrendDto } from "@/applications/trend/evm-trend-application-service";
import { DataFreshnessPanel } from "@/components/wbs/data-freshness-panel";
import type { WbsImportScheduleDto } from "@/types/import-schedule";
import type { ProjectKind, StandingCategory } from "@/types/project";
import type { SteadyWorkTaskDto } from "@/types/steady-work-plan";
import { SteadyWorkPlanPanel } from "@/components/standing-work/steady-work-plan-panel";
import { getWbsTabs, resolveWbsTab } from "@/components/wbs/wbs-tabs";

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
    /** 種別（省略時は案件）。常設は タブ構成が変わる（docs/plans/non-project-work-management.md §6.6） */
    kind?: ProjectKind;
    category?: StandingCategory;
  };
  tasks: WbsTask[];
  buffers: Array<{
    bufferType: string;
    buffer: number;
    name: string;
  }>;
  phases: Array<{ id: number; seq: number; name: string; code: string }>;
  assignees: Array<{ assignee: { id?: number; displayName: string } | null }> | null;
  milestones: Milestone[];
  /** 常設プロジェクトの定常タスク（定常枠タブに表示） */
  steadyWorkTasks?: SteadyWorkTaskDto[];
  /** マイルストーンと達成見込み（マイルストーンタブに表示） */
  milestoneForecasts?: MilestoneForecastDto[];
  /** 遅れ・期限間近のタスク（サマリータブに表示） */
  taskDelays?: TaskDelayDto[];
  /** データの鮮度（サマリータブ・EVMタブに表示） */
  dataFreshness?: DataFreshnessDto | null;
  /** 前回の確認日（ISO）。遅延タスク一覧の「新規」とEVMの前回比に使う */
  previousReviewDate?: string | null;
  /** 悪化トレンド（EVMタブに表示） */
  evmTrend?: EvmTrendDto | null;
  importSchedule: WbsImportScheduleDto;
  defaultTab?: string;
  showEvm?: boolean;
  showTags?: boolean;
  defaultProgressMethod?: ProgressMeasurementMethod;
  defaultForecastMethod?: EvmForecastMethod;
  progressReviewCycle?: ProgressReviewCycle;
  deadlineAlertDays?: number;
  costOverrunThresholdPct?: number;
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
  steadyWorkTasks = [],
  milestoneForecasts = [],
  taskDelays = [],
  dataFreshness = null,
  previousReviewDate = null,
  evmTrend = null,
  importSchedule,
  defaultTab,
  showEvm = true,
  showTags = true,
  defaultProgressMethod,
  defaultForecastMethod,
  progressReviewCycle,
  deadlineAlertDays = 1,
  costOverrunThresholdPct = 100,
}: WbsManagementContentProps) {
  const kind: ProjectKind = project.kind ?? "PROJECT";
  const isStanding = kind === "STANDING";
  const tabs = getWbsTabs(kind, { showEvm });
  const hasTab = (tab: (typeof tabs)[number]) => tabs.includes(tab);
  const initialTab = resolveWbsTab(kind, defaultTab, { showEvm });
  const steadyWorkAssignees = (assignees ?? [])
    .map((row) => row.assignee)
    .filter((assignee): assignee is { id: number; displayName: string } => assignee?.id !== undefined);

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
        {!isStanding && (
          <Link href={`/wbs/${wbsId}/progress-history`}>
            <Button className="bg-white text-black ml-2" title="進捗履歴の訂正">
              <History className="h-4 w-4" />
            </Button>
          </Link>
        )}
        <TaskModal wbsId={wbsId}>
          <Button className="bg-white text-black ml-2 mr-2">
            <CirclePlus className="h-4 w-4" />
            <CalendarCheck className="h-4 w-4" />
          </Button>
        </TaskModal>
        {!isStanding && <WbsImportJobButtons wbsId={wbsId} wbsName={wbsName} />}
      </div>

      <Suspense
        fallback={
          <div className="flex justify-center">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        }
      >
        {/* タブ */}
        <Tabs defaultValue={initialTab} className="mt-2">
          <TabsList className="flex flex-row justify-start gap-2 border-b-2 border-gray-200">
            <TabsTrigger value="summary" className="flex items-center gap-2" title="サマリー">
              <LayoutDashboard className="h-4 w-4" />
            </TabsTrigger>
            <TabsTrigger value="list" className="flex items-center gap-2" title="リスト">
              <List className="h-4 w-4" />
            </TabsTrigger>
            {hasTab("steady-work") && (
              <TabsTrigger value="steady-work" className="flex items-center gap-2" title="定常枠">
                <Repeat className="h-4 w-4" />
              </TabsTrigger>
            )}
            {hasTab("milestone") && (
              <TabsTrigger value="milestone" className="flex items-center gap-2" title="マイルストーン">
                <CalendarCheck className="h-4 w-4" />
              </TabsTrigger>
            )}
            {hasTab("table") && (
              <TabsTrigger value="table" className="flex items-center gap-2" title="月別集計">
                <Table className="h-4 w-4" />
              </TabsTrigger>
            )}
            <TabsTrigger
              value="assignee-gantt"
              className="flex items-center gap-2"
              title="担当者ガント"
            >
              <Users className="h-4 w-4" />
            </TabsTrigger>
            {hasTab("evm") && (
              <TabsTrigger value="evm" className="flex items-center gap-2" title="EVM">
                <TrendingUp className="h-4 w-4" />
              </TabsTrigger>
            )}
            {hasTab("task-scheduling") && (
              <TabsTrigger value="task-scheduling" className="flex items-center gap-2" title="スケジュール">
                <Calendar className="h-4 w-4" />
              </TabsTrigger>
            )}
            <TabsTrigger value="settings" className="flex items-center gap-2" title="設定">
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
                  kind,
                  category: project.category,
                }}
                phases={phases}
                assignees={assignees || []}
                buffers={buffers}
                tasks={tasks}
                milestones={milestones}
                taskDelays={taskDelays}
                previousReviewDate={previousReviewDate}
                deadlineAlertDays={deadlineAlertDays}
                costOverrunThresholdPct={costOverrunThresholdPct}
              />
              {dataFreshness && <DataFreshnessPanel freshness={dataFreshness} />}
            </div>
          </TabsContent>
          <TabsContent value="list">
            <TaskTableViewPage wbsTasks={tasks} wbsId={wbsId} />
          </TabsContent>
          {hasTab("steady-work") && (
            <TabsContent value="steady-work">
              <SteadyWorkPlanPanel
                wbsId={wbsId}
                initialTasks={steadyWorkTasks}
                assignees={steadyWorkAssignees}
              />
            </TabsContent>
          )}
          {hasTab("milestone") && (
            <TabsContent value="milestone">
              <MilestoneManagement
                wbsId={wbsId}
                initialMilestones={milestoneForecasts}
                phases={phases}
                tasks={tasks.map((task) => ({ id: task.id, taskNo: task.taskNo, name: task.name }))}
              />
            </TabsContent>
          )}
          {hasTab("table") && (
            <TabsContent value="table">
              <WbsSummaryTables projectId={project.id} wbsId={wbsId} />
            </TabsContent>
          )}
          <TabsContent value="assignee-gantt">
            <AssigneeGanttChart wbsId={wbsId} />
          </TabsContent>
          {hasTab("evm") && (
            <TabsContent value="evm" className="space-y-4">
              {dataFreshness && <DataFreshnessPanel freshness={dataFreshness} />}
              <EvmDashboard
                wbsId={wbsId}
                defaultProgressMethod={defaultProgressMethod}
                defaultForecastMethod={defaultForecastMethod}
                progressReviewCycle={progressReviewCycle}
                previousReviewDate={previousReviewDate}
                phases={phases}
                trend={evmTrend}
              />
            </TabsContent>
          )}
          {hasTab("task-scheduling") && (
            <TabsContent value="task-scheduling">
              <SchedulingWorkbench wbsId={wbsId} />
            </TabsContent>
          )}
          <TabsContent value="settings" className="space-y-4">
            <ProjectSettings projectId={project.id} />
            {!isStanding && <WbsImportScheduleSettings wbsId={wbsId} schedule={importSchedule} />}
          </TabsContent>
        </Tabs>
      </Suspense>
    </>
  );
}
