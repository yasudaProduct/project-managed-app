"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { WbsTask } from "@/types/wbs";
import { getTaskStatusName } from "@/utils/utils";
import { Calendar, Filter, Eye, EyeOff, User, BarChart3 } from "lucide-react";
import { cn } from "@/utils/utils";

export type ViewMode = "day" | "week" | "month" | "quarter";
export type GroupBy = "phase" | "assignee" | "status" | "none";

const VIEW_MODES = [
  { value: "day" as ViewMode, label: "日", days: 1 },
  { value: "week" as ViewMode, label: "週", days: 7 },
  { value: "month" as ViewMode, label: "月", days: 30 },
  { value: "quarter" as ViewMode, label: "四半期", days: 90 },
];

const GROUP_OPTIONS = [
  { value: "none" as GroupBy, label: "グループなし" },
  { value: "phase" as GroupBy, label: "工程別" },
  { value: "assignee" as GroupBy, label: "担当者別" },
  { value: "status" as GroupBy, label: "ステータス別" },
];

interface GanttControlsProps {
  viewMode: ViewMode;
  groupBy: GroupBy;
  statusFilter: string;
  assigneeFilter: string;
  showMilestones: boolean;
  tasks: WbsTask[];
  onViewModeChange: (mode: ViewMode) => void;
  onGroupByChange: (groupBy: GroupBy) => void;
  onStatusFilterChange: (status: string) => void;
  onAssigneeFilterChange: (assignee: string) => void;
  onShowMilestonesChange: (show: boolean) => void;
}

export default function GanttControls({
  viewMode,
  groupBy,
  statusFilter,
  assigneeFilter,
  showMilestones,
  tasks,
  onViewModeChange,
  onGroupByChange,
  onStatusFilterChange,
  onAssigneeFilterChange,
  onShowMilestonesChange,
}: GanttControlsProps) {
  return (
    <div className="bg-gray-50 px-3 py-2 rounded-lg">
      <div className="flex flex-wrap items-center gap-3">
        {/* 表示モード */}
        <div className="flex items-center gap-1.5">
          <label className="text-xs text-muted-foreground whitespace-nowrap flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            表示モード
          </label>
          <Select value={viewMode} onValueChange={onViewModeChange}>
            <SelectTrigger data-testid="view-mode-select" className="h-7 text-xs w-[80px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {VIEW_MODES.map((mode) => (
                <SelectItem key={mode.value} value={mode.value}>
                  {mode.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* グループ化 */}
        <div className="flex items-center gap-1.5">
          <label className="text-xs text-muted-foreground whitespace-nowrap flex items-center gap-1">
            <BarChart3 className="h-3 w-3" />
            グループ化
          </label>
          <Select value={groupBy} onValueChange={onGroupByChange}>
            <SelectTrigger data-testid="group-by-select" className="h-7 text-xs w-[110px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {GROUP_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* ステータスフィルター */}
        <div className="flex items-center gap-1.5">
          <label className="text-xs text-muted-foreground whitespace-nowrap flex items-center gap-1">
            <Filter className="h-3 w-3" />
            ステータス
          </label>
          <Select value={statusFilter} onValueChange={onStatusFilterChange}>
            <SelectTrigger data-testid="status-filter-select" className="h-7 text-xs w-[100px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">すべて</SelectItem>
              {Array.from(new Set(tasks.map((t) => t.status))).map((status) => (
                <SelectItem key={status} value={status}>
                  {getTaskStatusName(status)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* 担当者フィルター */}
        <div className="flex items-center gap-1.5">
          <label className="text-xs text-muted-foreground whitespace-nowrap flex items-center gap-1">
            <User className="h-3 w-3" />
            担当者
          </label>
          <Select value={assigneeFilter} onValueChange={onAssigneeFilterChange}>
            <SelectTrigger data-testid="assignee-filter-select" className="h-7 text-xs w-[100px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">すべて</SelectItem>
              {Array.from(
                new Set(
                  tasks.map((t) => t.assignee?.displayName).filter(Boolean)
                )
              ).map((assignee) => (
                <SelectItem key={assignee} value={assignee!}>
                  {assignee}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* マイルストーン表示 */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => onShowMilestonesChange(!showMilestones)}
          className={cn(
            "h-7 text-xs gap-1.5 px-2",
            showMilestones && "bg-blue-50 border-blue-200"
          )}
          data-testid="milestone-toggle-button"
        >
          {showMilestones ? (
            <Eye className="h-3 w-3" />
          ) : (
            <EyeOff className="h-3 w-3" />
          )}
          マイルストーン
        </Button>
      </div>
    </div>
  );
}
