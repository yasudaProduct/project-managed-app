"use client";

import {
  Shield,
  Calendar,
  User,
  Trello,
  ClipboardList,
  AlertTriangle,
  Clock,
  Flag,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { getProjectStatusName } from "@/utils/utils";
import { formatDate } from "@/utils/date-util";
import { ProjectStatus, WbsTask, Milestone, TaskStatus } from "@/types/wbs";
import { useMemo } from "react";

interface ProjectInfoCardProps {
  project: {
    description: string | null;
    status: ProjectStatus;
    startDate: Date;
    endDate: Date;
  };
  phases: Array<{ name: string; seq?: number }>;
  assignees: Array<{ assignee: { displayName: string } | null }> | null;
  buffers: Array<{
    bufferType: string;
    buffer: number;
    name: string;
  }>;
  tasks: WbsTask[];
  milestones: Milestone[];
  deadlineAlertDays: number;
  costOverrunThresholdPct: number;
}

const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  NOT_STARTED: "未着手",
  IN_PROGRESS: "着手中",
  COMPLETED: "完了",
  ON_HOLD: "保留",
};

const TASK_STATUS_COLORS: Record<TaskStatus, string> = {
  NOT_STARTED: "bg-gray-100 text-gray-700",
  IN_PROGRESS: "bg-blue-100 text-blue-700",
  COMPLETED: "bg-green-100 text-green-700",
  ON_HOLD: "bg-yellow-100 text-yellow-700",
};

function getDaysUntil(targetDate: Date): number {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const target = new Date(targetDate);
  const targetDay = new Date(
    target.getFullYear(),
    target.getMonth(),
    target.getDate()
  );
  return Math.ceil(
    (targetDay.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
  );
}

export function ProjectInfoCard({
  project,
  phases,
  assignees,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  buffers,
  tasks,
  milestones,
  deadlineAlertDays,
  costOverrunThresholdPct,
}: ProjectInfoCardProps) {
  // 工程別タスクステータス集計
  const phaseTaskSummary = useMemo(() => {
    const phaseMap = new Map<
      string,
      { name: string; seq: number; statuses: Record<TaskStatus, number>; total: number; completed: number }
    >();

    for (const phase of phases) {
      phaseMap.set(phase.name, {
        name: phase.name,
        seq: phase.seq ?? 0,
        statuses: { NOT_STARTED: 0, IN_PROGRESS: 0, COMPLETED: 0, ON_HOLD: 0 },
        total: 0,
        completed: 0,
      });
    }

    for (const task of tasks) {
      const phaseName = task.phase?.name;
      if (!phaseName) continue;
      const entry = phaseMap.get(phaseName);
      if (!entry) continue;
      entry.statuses[task.status]++;
      entry.total++;
      if (task.status === "COMPLETED") entry.completed++;
    }

    return Array.from(phaseMap.values()).sort((a, b) => a.seq - b.seq);
  }, [tasks, phases]);

  // 全体進捗
  const overallProgress = useMemo(() => {
    if (tasks.length === 0) return 0;
    const completed = tasks.filter((t) => t.status === "COMPLETED").length;
    return Math.round((completed / tasks.length) * 100);
  }, [tasks]);

  // 期限間近 / 期限超過タスク（未着手・着手中のみ）
  const deadlineTasks = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const alertDate = new Date(today);
    alertDate.setDate(alertDate.getDate() + deadlineAlertDays);

    return tasks
      .filter((task) => {
        if (task.status === "COMPLETED" || task.status === "ON_HOLD")
          return false;
        if (!task.yoteiEnd) return false;
        const endDate = new Date(task.yoteiEnd);
        return endDate <= alertDate;
      })
      .sort((a, b) => {
        const aEnd = new Date(a.yoteiEnd!).getTime();
        const bEnd = new Date(b.yoteiEnd!).getTime();
        return aEnd - bEnd;
      });
  }, [tasks, deadlineAlertDays]);

  // 工数超過タスク
  const costOverrunTasks = useMemo(() => {
    if (costOverrunThresholdPct <= 0) return [];
    return tasks
      .filter((task) => {
        if (task.status === "COMPLETED") return false;
        const planned = task.yoteiKosu;
        const actual = task.jissekiKosu;
        if (!planned || planned === 0 || actual === undefined || actual === null)
          return false;
        const ratio = (actual / planned) * 100;
        return ratio >= costOverrunThresholdPct;
      })
      .sort((a, b) => {
        const aNo = a.taskNo || "";
        const bNo = b.taskNo || "";
        return aNo.localeCompare(bNo, undefined, { numeric: true });
      });
  }, [tasks, costOverrunThresholdPct]);

  // マイルストーン（日付の近い順から3件、未来のもの優先）
  const upcomingMilestones = useMemo(() => {
    return [...milestones]
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .filter((m) => {
        const d = new Date(m.date);
        const daysUntil = getDaysUntil(d);
        return daysUntil >= -7; // 7日前まで表示
      })
      .slice(0, 3);
  }, [milestones]);

  return (
    <Card className="shadow-sm border-gray-200">
      <CardContent className="p-6">
        {/* Description */}
        {project.description && (
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-gray-600 mb-2">概要</h3>
            <p className="text-gray-700 bg-gray-50 p-4 rounded-lg">
              {project.description}
            </p>
          </div>
        )}

        {/* Project Details Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column */}
          <div className="space-y-4">
            {/* Status */}
            <div className="bg-white p-4 rounded-lg border border-gray-100">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-blue-50 rounded-lg">
                  <Shield className="h-5 w-5 text-blue-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-gray-600 mb-1">
                    プロジェクト状況
                  </p>
                  <Badge variant="outline" className="text-sm">
                    {getProjectStatusName(project.status)}
                  </Badge>
                </div>
              </div>
            </div>

            {/* Period */}
            <div className="bg-white p-4 rounded-lg border border-gray-100">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-blue-50 rounded-lg">
                  <Calendar className="h-5 w-5 text-blue-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-gray-600 mb-1">
                    プロジェクト期間
                  </p>
                  <p className="text-gray-700">
                    {formatDate(project.startDate, "YYYY/MM/DD")}
                    <span className="mx-2 text-gray-400">〜</span>
                    {formatDate(project.endDate, "YYYY/MM/DD")}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-4">
            {/* Phases */}
            <div className="bg-white p-4 rounded-lg border border-gray-100">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-blue-50 rounded-lg">
                  <Trello className="h-5 w-5 text-blue-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-gray-600 mb-2">
                    工程
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {phases.map((phase, index) => (
                      <Badge
                        key={index}
                        variant="secondary"
                        className="text-sm px-3 py-1"
                      >
                        {phase.name}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Assignees */}
            <div className="bg-white p-4 rounded-lg border border-gray-100">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-blue-50 rounded-lg">
                  <User className="h-5 w-5 text-blue-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-gray-600 mb-2">
                    担当者
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {assignees?.map((assignee, index) => (
                      <Badge
                        key={index}
                        variant="outline"
                        className="text-sm px-3 py-1"
                      >
                        {assignee.assignee?.displayName}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Task Status Section */}
        {tasks.length > 0 && (
          <div className="mt-6">
            <div className="flex items-center gap-2 mb-4">
              <ClipboardList className="h-5 w-5 text-blue-600" />
              <h3 className="text-sm font-semibold text-gray-600">
                タスク状況
              </h3>
              <span className="text-xs text-gray-500 ml-auto">
                全{tasks.length}件 / 完了{overallProgress}%
              </span>
            </div>

            {/* Overall Progress Bar */}
            <div className="mb-4">
              <Progress value={overallProgress} className="h-2" />
            </div>

            {/* Phase-wise Task Status */}
            <div className="space-y-3">
              {phaseTaskSummary.map((phase) => {
                if (phase.total === 0) return null;
                const progressPct = Math.round(
                  (phase.completed / phase.total) * 100
                );
                return (
                  <div
                    key={phase.name}
                    className="bg-gray-50 p-3 rounded-lg"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">
                        {phase.name}
                      </span>
                      <span className="text-xs text-gray-500">
                        {phase.completed}/{phase.total} ({progressPct}%)
                      </span>
                    </div>
                    <Progress value={progressPct} className="h-1.5 mb-2" />
                    <div className="flex flex-wrap gap-1.5">
                      {(
                        Object.entries(phase.statuses) as [
                          TaskStatus,
                          number
                        ][]
                      ).map(([status, count]) =>
                        count > 0 ? (
                          <span
                            key={status}
                            className={`text-xs px-2 py-0.5 rounded-full ${TASK_STATUS_COLORS[status]}`}
                          >
                            {TASK_STATUS_LABELS[status]}: {count}
                          </span>
                        ) : null
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Deadline Alert Tasks */}
        {deadlineTasks.length > 0 && (
          <div className="mt-6">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              <h3 className="text-sm font-semibold text-gray-600">
                期限間近のタスク
              </h3>
              <span className="text-xs text-gray-400">
                (期限{deadlineAlertDays}日前〜)
              </span>
              <Badge variant="destructive" className="text-xs ml-auto">
                {deadlineTasks.length}件
              </Badge>
            </div>
            <div className="space-y-2">
              {deadlineTasks.map((task) => {
                const daysUntil = getDaysUntil(new Date(task.yoteiEnd!));
                const isOverdue = daysUntil < 0;
                return (
                  <div
                    key={task.id}
                    className={`p-3 rounded-lg border ${
                      isOverdue
                        ? "bg-red-50 border-red-200"
                        : "bg-orange-50 border-orange-200"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 min-w-0">
                        {task.taskNo && (
                          <span className="text-xs font-mono text-gray-500 shrink-0">
                            {task.taskNo}
                          </span>
                        )}
                        <span
                          className={`text-sm truncate ${
                            isOverdue
                              ? "text-red-700 font-semibold"
                              : "text-gray-700"
                          }`}
                        >
                          {task.name}
                        </span>
                        <span
                          className={`text-xs px-1.5 py-0.5 rounded-full shrink-0 ${
                            TASK_STATUS_COLORS[task.status]
                          }`}
                        >
                          {TASK_STATUS_LABELS[task.status]}
                        </span>
                      </div>
                      <Badge
                        variant={isOverdue ? "destructive" : "outline"}
                        className="text-xs shrink-0 ml-2"
                      >
                        {isOverdue
                          ? `${Math.abs(daysUntil)}日超過`
                          : daysUntil === 0
                          ? "本日期限"
                          : `残${daysUntil}日`}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-500">
                      {task.phase && (
                        <span className="bg-gray-100 px-1.5 py-0.5 rounded">
                          {task.phase.name}
                        </span>
                      )}
                      {task.assignee && (
                        <span>{task.assignee.displayName}</span>
                      )}
                      <span>
                        {task.yoteiStart
                          ? formatDate(new Date(task.yoteiStart), "YYYY/MM/DD")
                          : "未定"}
                        {" 〜 "}
                        {formatDate(new Date(task.yoteiEnd!), "YYYY/MM/DD")}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Cost Overrun Tasks */}
        {costOverrunTasks.length > 0 && (
          <div className="mt-6">
            <div className="flex items-center gap-2 mb-3">
              <Clock className="h-5 w-5 text-red-500" />
              <h3 className="text-sm font-semibold text-gray-600">
                工数超過タスク
              </h3>
              <span className="text-xs text-gray-400">
                (予定工数の{costOverrunThresholdPct}%以上)
              </span>
              <Badge variant="destructive" className="text-xs ml-auto">
                {costOverrunTasks.length}件
              </Badge>
            </div>
            <div className="space-y-2">
              {costOverrunTasks.map((task) => {
                const planned = task.yoteiKosu!;
                const actual = task.jissekiKosu!;
                const ratio = Math.round((actual / planned) * 100);
                return (
                  <div
                    key={task.id}
                    className="p-3 rounded-lg border bg-red-50 border-red-200"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 min-w-0">
                        {task.taskNo && (
                          <span className="text-xs font-mono text-gray-500 shrink-0">
                            {task.taskNo}
                          </span>
                        )}
                        <span className="text-sm text-red-700 truncate">
                          {task.name}
                        </span>
                        <span
                          className={`text-xs px-1.5 py-0.5 rounded-full shrink-0 ${
                            TASK_STATUS_COLORS[task.status]
                          }`}
                        >
                          {TASK_STATUS_LABELS[task.status]}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 ml-2">
                        <span className="text-xs text-gray-500">
                          {actual}h / {planned}h
                        </span>
                        <Badge variant="destructive" className="text-xs">
                          {ratio}%
                        </Badge>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-500">
                      {task.phase && (
                        <span className="bg-gray-100 px-1.5 py-0.5 rounded">
                          {task.phase.name}
                        </span>
                      )}
                      {task.assignee && (
                        <span>{task.assignee.displayName}</span>
                      )}
                      {(task.yoteiStart || task.yoteiEnd) && (
                        <span>
                          {task.yoteiStart
                            ? formatDate(new Date(task.yoteiStart), "YYYY/MM/DD")
                            : "未定"}
                          {" 〜 "}
                          {task.yoteiEnd
                            ? formatDate(new Date(task.yoteiEnd), "YYYY/MM/DD")
                            : "未定"}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Milestones */}
        {upcomingMilestones.length > 0 && (
          <div className="mt-6">
            <div className="flex items-center gap-2 mb-3">
              <Flag className="h-5 w-5 text-purple-500" />
              <h3 className="text-sm font-semibold text-gray-600">
                マイルストーン
              </h3>
            </div>
            <div className="space-y-2">
              {upcomingMilestones.map((milestone) => {
                const daysUntil = getDaysUntil(new Date(milestone.date));
                const isPast = daysUntil < 0;
                const isToday = daysUntil === 0;
                return (
                  <div
                    key={milestone.id}
                    className={`flex items-center justify-between p-3 rounded-lg border ${
                      isPast
                        ? "bg-gray-50 border-gray-200"
                        : isToday
                        ? "bg-purple-50 border-purple-200"
                        : "bg-white border-gray-200"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Flag
                        className={`h-4 w-4 ${
                          isPast
                            ? "text-gray-400"
                            : isToday
                            ? "text-purple-600"
                            : "text-purple-500"
                        }`}
                      />
                      <span
                        className={`text-sm font-medium ${
                          isPast ? "text-gray-400 line-through" : "text-gray-700"
                        }`}
                      >
                        {milestone.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500">
                        {formatDate(new Date(milestone.date), "YYYY/MM/DD")}
                      </span>
                      <Badge
                        variant={
                          isPast
                            ? "secondary"
                            : isToday
                            ? "default"
                            : daysUntil <= 7
                            ? "destructive"
                            : "outline"
                        }
                        className="text-xs"
                      >
                        {isPast
                          ? `${Math.abs(daysUntil)}日経過`
                          : isToday
                          ? "本日"
                          : `あと${daysUntil}日`}
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
