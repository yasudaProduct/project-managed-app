import React from "react";
import { Task, TaskStatus } from "./gantt";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { X } from "lucide-react";
import {
  PLAN_COLOR,
  ACTUAL_COLOR,
  FORECAST_COLOR,
} from "./colorMode";

interface TaskDetailSidebarProps {
  task: Task | null;
  onClose: () => void;
}

const STATUS_LABELS: Record<TaskStatus, string> = {
  NOT_STARTED: "未開始",
  IN_PROGRESS: "進行中",
  COMPLETED: "完了",
  ON_HOLD: "保留",
};

const formatDate = (date?: Date): string => {
  if (!date || isNaN(date.getTime())) return "-";
  return date
    .toLocaleDateString("ja-JP", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    })
    .replace(/\./g, "/");
};

const formatKosu = (kosu?: number): string => {
  if (kosu === undefined || kosu === null) return "-";
  return `${Math.round(kosu * 10) / 10}h`;
};

/**
 * タスク詳細サイドバー
 *
 * ガントのチャート部分（タスクバー）またはタスク行を押すと表示され、
 * 予定・実績・見通しの工数と期間を表示する。
 */
export const TaskDetailSidebar: React.FC<TaskDetailSidebarProps> = ({
  task,
  onClose,
}) => {
  if (!task) return null;

  return (
    <div className="w-80 flex-shrink-0 border-l border-border bg-card overflow-y-auto">
      <div className="sticky top-0 bg-card border-b border-border px-4 py-3 flex items-center justify-between">
        <h3 className="font-semibold text-sm truncate pr-2">{task.name}</h3>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 flex-shrink-0"
          onClick={onClose}
        >
          <X className="w-4 h-4" />
        </Button>
      </div>

      <div className="p-4 space-y-4 text-sm">
        {/* 基本情報 */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">フェーズ</span>
            <span className="font-medium">{task.category || "-"}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">担当者</span>
            <span className="font-medium">{task.assignee || "-"}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">ステータス</span>
            <span className="font-medium">
              {task.status ? STATUS_LABELS[task.status] : "-"}
            </span>
          </div>
          {task.isMilestone && (
            <div className="flex justify-end">
              <Badge variant="secondary">マイルストーン</Badge>
            </div>
          )}
        </div>

        {!task.isMilestone && (
          <>
            {/* 予定 */}
            <div className="rounded-md border border-border p-3 space-y-1">
              <div className="flex items-center gap-2 mb-1">
                <span
                  className="w-2.5 h-2.5 rounded-sm"
                  style={{ backgroundColor: PLAN_COLOR }}
                />
                <span className="font-medium">予定</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">期間</span>
                <span>
                  {formatDate(task.startDate)} 〜 {formatDate(task.endDate)}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">予定工数</span>
                <span className="font-medium">
                  {formatKosu(task.yoteiKosu ?? task.duration)}
                </span>
              </div>
            </div>

            {/* 実績 */}
            <div className="rounded-md border border-border p-3 space-y-1">
              <div className="flex items-center gap-2 mb-1">
                <span
                  className="w-2.5 h-2.5 rounded-sm"
                  style={{ backgroundColor: ACTUAL_COLOR }}
                />
                <span className="font-medium">実績</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">期間</span>
                <span>
                  {formatDate(task.jissekiStart)} 〜{" "}
                  {formatDate(task.jissekiEnd)}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">実績工数</span>
                <span className="font-medium">
                  {formatKosu(task.jissekiKosu)}
                </span>
              </div>
            </div>

            {/* 見通し */}
            <div className="rounded-md border border-border p-3 space-y-1">
              <div className="flex items-center gap-2 mb-1">
                <span
                  className="w-2.5 h-2.5 rounded-sm"
                  style={{ backgroundColor: FORECAST_COLOR }}
                />
                <span className="font-medium">見通し</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">見通し工数</span>
                <span className="font-medium">
                  {formatKosu(task.forecastKosu)}
                </span>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
