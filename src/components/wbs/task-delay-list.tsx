"use client";

import { useMemo, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatDate } from "@/utils/date-util";
import { TASK_DELAY_KIND_LABELS } from "@/types/task-delay";
import type { TaskDelayDto } from "@/applications/task-delay/task-delay-application-service";

type TaskDelayListProps = {
  delays: TaskDelayDto[];
  /** 期限間近とする日数（プロジェクト設定 deadlineAlertDays） */
  dueSoonDays: number;
};

const ALL_ASSIGNEES = "all";
const UNASSIGNED = "unassigned";

function delayLabel(delay: TaskDelayDto): string {
  if (delay.kind !== "DUE_SOON") {
    return `${TASK_DELAY_KIND_LABELS[delay.kind]} ${delay.days}日`;
  }
  return delay.days === 0 ? "本日期限" : `残り${delay.days}日`;
}

const assigneeKey = (delay: TaskDelayDto) =>
  delay.assigneeId === null ? UNASSIGNED : String(delay.assigneeId);

/**
 * 遅れ（終了遅れ・開始遅れ）と期限間近のタスク一覧。
 * 判定と並び順はサーバー側（ドメイン）で決まる。作業者が自分の分を見られるよう担当者で絞り込める。
 */
export function TaskDelayList({ delays, dueSoonDays }: TaskDelayListProps) {
  const [assigneeFilter, setAssigneeFilter] = useState(ALL_ASSIGNEES);

  const assigneeOptions = useMemo(() => {
    const options = new Map<string, string>();
    for (const delay of delays) {
      options.set(assigneeKey(delay), delay.assigneeName ?? "未割当");
    }
    return Array.from(options, ([value, label]) => ({ value, label }));
  }, [delays]);

  const visibleDelays =
    assigneeFilter === ALL_ASSIGNEES
      ? delays
      : delays.filter((delay) => assigneeKey(delay) === assigneeFilter);

  if (delays.length === 0) return null;

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <AlertTriangle className="h-5 w-5 text-orange-500" />
        <h3 className="text-sm font-semibold text-gray-600">
          遅れ・期限間近のタスク
        </h3>
        <span className="text-xs text-gray-400">(期限{dueSoonDays}日前〜)</span>
        <Select value={assigneeFilter} onValueChange={setAssigneeFilter}>
          <SelectTrigger
            className="h-7 text-xs w-[130px] ml-auto"
            aria-label="担当者で絞り込み"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_ASSIGNEES}>全担当者</SelectItem>
            {assigneeOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Badge variant="destructive" className="text-xs">
          {visibleDelays.length}件
        </Badge>
      </div>
      <div className="space-y-2">
        {visibleDelays.map((delay) => {
          const isOverdue = delay.kind !== "DUE_SOON";
          return (
            <div
              key={delay.taskId}
              className={`p-3 rounded-lg border ${
                isOverdue
                  ? "bg-red-50 border-red-200"
                  : "bg-orange-50 border-orange-200"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-xs font-mono text-gray-500 shrink-0">
                    {delay.taskNo}
                  </span>
                  <span
                    className={`text-sm truncate ${
                      isOverdue ? "text-red-700 font-semibold" : "text-gray-700"
                    }`}
                  >
                    {delay.taskName}
                  </span>
                </div>
                <Badge
                  variant={isOverdue ? "destructive" : "outline"}
                  className="text-xs shrink-0 ml-2"
                >
                  {delayLabel(delay)}
                </Badge>
              </div>
              <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-500">
                {delay.phaseName && (
                  <span className="bg-gray-100 px-1.5 py-0.5 rounded">
                    {delay.phaseName}
                  </span>
                )}
                <span>{delay.assigneeName ?? "未割当"}</span>
                <span>
                  {delay.plannedStart
                    ? formatDate(new Date(delay.plannedStart), "YYYY/MM/DD")
                    : "未定"}
                  {" 〜 "}
                  {delay.plannedEnd
                    ? formatDate(new Date(delay.plannedEnd), "YYYY/MM/DD")
                    : "未定"}
                </span>
                {delay.progressRate !== null && (
                  <span>進捗 {delay.progressRate}%</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
