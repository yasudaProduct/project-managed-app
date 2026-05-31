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
  Copy,
  Check,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { getProjectStatusName } from "@/utils/utils";
import { formatDate } from "@/utils/date-util";
import { ProjectStatus, WbsTask, Milestone, TaskStatus } from "@/types/wbs";
import { useMemo, useState, useCallback } from "react";

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
  // 予定日から「本来あるべきステータス」を算出
  function getPlannedStatus(task: WbsTask): TaskStatus | null {
    if (task.status === "ON_HOLD") return "ON_HOLD";
    if (!task.yoteiStart || !task.yoteiEnd) return null;
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const start = new Date(task.yoteiStart);
    const startDay = new Date(start.getFullYear(), start.getMonth(), start.getDate());
    const end = new Date(task.yoteiEnd);
    const endDay = new Date(end.getFullYear(), end.getMonth(), end.getDate());
    if (today > endDay) return "COMPLETED";
    if (today >= startDay) return "IN_PROGRESS";
    return "NOT_STARTED";
  }

  // 工程別タスクステータス集計（実績 + 予定ベース）
  const phaseTaskSummary = useMemo(() => {
    const phaseMap = new Map<
      string,
      {
        name: string;
        seq: number;
        statuses: Record<TaskStatus, number>;
        total: number;
        completed: number;
        plannedStatuses: Record<TaskStatus, number>;
        plannedTotal: number;
        plannedCompleted: number;
      }
    >();

    for (const phase of phases) {
      phaseMap.set(phase.name, {
        name: phase.name,
        seq: phase.seq ?? 0,
        statuses: { NOT_STARTED: 0, IN_PROGRESS: 0, COMPLETED: 0, ON_HOLD: 0 },
        total: 0,
        completed: 0,
        plannedStatuses: { NOT_STARTED: 0, IN_PROGRESS: 0, COMPLETED: 0, ON_HOLD: 0 },
        plannedTotal: 0,
        plannedCompleted: 0,
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

      const planned = getPlannedStatus(task);
      if (planned) {
        entry.plannedStatuses[planned]++;
        entry.plannedTotal++;
        if (planned === "COMPLETED") entry.plannedCompleted++;
      }
    }

    return Array.from(phaseMap.values()).sort((a, b) => a.seq - b.seq);
  }, [tasks, phases]);

  // 全体進捗（実績）
  const overallProgress = useMemo(() => {
    if (tasks.length === 0) return 0;
    const completed = tasks.filter((t) => t.status === "COMPLETED").length;
    return Math.round((completed / tasks.length) * 100);
  }, [tasks]);

  // 全体進捗（予定ベース）
  const overallPlannedProgress = useMemo(() => {
    const tasksWithPlan = tasks.filter((t) => t.yoteiStart && t.yoteiEnd);
    if (tasksWithPlan.length === 0) return 0;
    const shouldBeCompleted = tasksWithPlan.filter(
      (t) => getPlannedStatus(t) === "COMPLETED"
    ).length;
    return Math.round((shouldBeCompleted / tasksWithPlan.length) * 100);
  }, [tasks]);

  // タスク状況テーブルをTSVでコピー
  const [copied, setCopied] = useState(false);
  const handleCopyTsv = useCallback(() => {
    const statuses: TaskStatus[] = ["NOT_STARTED", "IN_PROGRESS", "COMPLETED", "ON_HOLD"];
    const header = ["工程", ...statuses.map((s) => TASK_STATUS_LABELS[s])].join("\t");
    const rows = phaseTaskSummary
      .filter((p) => p.total > 0)
      .map((phase) => {
        const cells = statuses.map((status) => {
          const actual = phase.statuses[status];
          if (phase.plannedTotal > 0) {
            return `${actual} / ${phase.plannedStatuses[status]}`;
          }
          return `${actual}`;
        });
        return [phase.name, ...cells].join("\t");
      });

    const totalRow = statuses.map((status) => {
      const actualTotal = phaseTaskSummary.reduce((sum, p) => sum + p.statuses[status], 0);
      const hasPlanned = phaseTaskSummary.some((p) => p.plannedTotal > 0);
      if (hasPlanned) {
        const plannedTotal = phaseTaskSummary.reduce((sum, p) => sum + p.plannedStatuses[status], 0);
        return `${actualTotal} / ${plannedTotal}`;
      }
      return `${actualTotal}`;
    });
    rows.push(["全体", ...totalRow].join("\t"));

    const tsv = [header, ...rows].join("\n");
    navigator.clipboard.writeText(tsv).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [phaseTaskSummary]);

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
                全{tasks.length}件
              </span>
            </div>

            {/* Overall Progress Bars */}
            <div className="mb-4 space-y-2">
              <div className="flex items-center gap-3">
                <span className="text-xs text-gray-500 w-20 shrink-0">
                  実績 {overallProgress}%
                </span>
                <Progress value={overallProgress} className="h-2 flex-1" />
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-amber-600 w-20 shrink-0">
                  予定 {overallPlannedProgress}%
                </span>
                <Progress
                  value={overallPlannedProgress}
                  className="h-2 flex-1 [&>div]:bg-amber-400"
                />
              </div>
            </div>

            {/* Phase-wise Progress Bars */}
            <div className="space-y-3">
              {phaseTaskSummary.map((phase) => {
                if (phase.total === 0) return null;
                const actualPct = Math.round(
                  (phase.completed / phase.total) * 100
                );
                const plannedPct =
                  phase.plannedTotal > 0
                    ? Math.round(
                        (phase.plannedCompleted / phase.plannedTotal) * 100
                      )
                    : 0;
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
                        {phase.total}件
                      </span>
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-gray-500 w-16 shrink-0">
                          実績 {actualPct}%
                        </span>
                        <Progress
                          value={actualPct}
                          className="h-1.5 flex-1"
                        />
                      </div>
                      {phase.plannedTotal > 0 && (
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-amber-600 w-16 shrink-0">
                            予定 {plannedPct}%
                          </span>
                          <Progress
                            value={plannedPct}
                            className="h-1.5 flex-1 [&>div]:bg-amber-400"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Task Status Table */}
            <div className="mt-4 overflow-x-auto">
              <div className="flex items-center justify-end mb-1">
                <button
                  type="button"
                  onClick={handleCopyTsv}
                  className="flex items-center gap-1 text-[10px] text-gray-400 hover:text-gray-600 transition-colors"
                  title="TSVでコピー"
                >
                  {copied ? (
                    <>
                      <Check className="h-3 w-3 text-green-500" />
                      <span className="text-green-500">コピーしました</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3 w-3" />
                      <span>コピー</span>
                    </>
                  )}
                </button>
              </div>
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2 px-2 font-semibold text-gray-600">
                      工程
                    </th>
                    {(
                      ["NOT_STARTED", "IN_PROGRESS", "COMPLETED", "ON_HOLD"] as TaskStatus[]
                    ).map((status) => (
                      <th
                        key={status}
                        className="text-center py-2 px-2 font-semibold text-gray-600"
                      >
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full ${TASK_STATUS_COLORS[status]}`}
                        >
                          {TASK_STATUS_LABELS[status]}
                        </span>
                      </th>
                    ))}
                    <th className="text-center py-2 px-2 font-semibold text-gray-600">
                      合計
                    </th>
                    <th className="text-center py-2 px-2 font-semibold text-gray-600">
                      進捗
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {phaseTaskSummary.map((phase) => {
                    if (phase.total === 0) return null;
                    const actualPct = Math.round(
                      (phase.completed / phase.total) * 100
                    );
                    const plannedPct =
                      phase.plannedTotal > 0
                        ? Math.round(
                            (phase.plannedCompleted / phase.plannedTotal) * 100
                          )
                        : null;
                    return (
                      <tr
                        key={phase.name}
                        className="border-b border-gray-100 hover:bg-gray-50"
                      >
                        <td className="py-2 px-2 font-medium text-gray-700">
                          {phase.name}
                        </td>
                        {(
                          ["NOT_STARTED", "IN_PROGRESS", "COMPLETED", "ON_HOLD"] as TaskStatus[]
                        ).map((status) => (
                          <td
                            key={status}
                            className="text-center py-2 px-2"
                          >
                            <span className="text-gray-700">
                              {phase.statuses[status]}
                            </span>
                            {phase.plannedTotal > 0 && (
                              <span className="text-amber-600 ml-1">
                                / {phase.plannedStatuses[status]}
                              </span>
                            )}
                          </td>
                        ))}
                        <td className="text-center py-2 px-2 text-gray-700">
                          {phase.total}
                        </td>
                        <td className="text-center py-2 px-2">
                          <span className="text-gray-700">{actualPct}%</span>
                          {plannedPct !== null && (
                            <span className="text-amber-600 ml-1">
                              / {plannedPct}%
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t border-gray-300 font-semibold">
                    <td className="py-2 px-2 text-gray-700">全体</td>
                    {(
                      ["NOT_STARTED", "IN_PROGRESS", "COMPLETED", "ON_HOLD"] as TaskStatus[]
                    ).map((status) => {
                      const actualTotal = phaseTaskSummary.reduce(
                        (sum, p) => sum + p.statuses[status],
                        0
                      );
                      const plannedTotal = phaseTaskSummary.reduce(
                        (sum, p) => sum + p.plannedStatuses[status],
                        0
                      );
                      const hasPlanned = phaseTaskSummary.some(
                        (p) => p.plannedTotal > 0
                      );
                      return (
                        <td
                          key={status}
                          className="text-center py-2 px-2"
                        >
                          <span className="text-gray-700">{actualTotal}</span>
                          {hasPlanned && (
                            <span className="text-amber-600 ml-1">
                              / {plannedTotal}
                            </span>
                          )}
                        </td>
                      );
                    })}
                    <td className="text-center py-2 px-2 text-gray-700">
                      {tasks.length}
                    </td>
                    <td className="text-center py-2 px-2">
                      <span className="text-gray-700">
                        {overallProgress}%
                      </span>
                      {overallPlannedProgress > 0 && (
                        <span className="text-amber-600 ml-1">
                          / {overallPlannedProgress}%
                        </span>
                      )}
                    </td>
                  </tr>
                </tfoot>
              </table>
              <div className="flex items-center gap-3 mt-2 text-[10px] text-gray-400">
                <span>※ 数値は 実績 / 予定 で表示</span>
              </div>
            </div>
          </div>
        )}

        {/* Deadline Alert & Cost Overrun Tasks - Side by Side */}
        {(deadlineTasks.length > 0 || costOverrunTasks.length > 0) && (
          <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Deadline Alert Tasks */}
            {deadlineTasks.length > 0 && (
              <div>
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
              <div>
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
