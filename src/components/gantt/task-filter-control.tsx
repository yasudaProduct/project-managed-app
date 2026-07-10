"use client";

import { useMemo } from "react";
import { Filter, X } from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Checkbox } from "../ui/checkbox";
import { Badge } from "../ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "../ui/popover";
import type { TaskStatus } from "./gantt";
import { TASK_STATUSES } from "@/types/wbs";
import { getTaskStatusName } from "@/utils/utils";
import {
  type TaskFilter,
  type KeywordMode,
  EMPTY_TASK_FILTER,
  UNASSIGNED_LABEL,
  countActiveFilters,
  isValidRegex,
} from "./utils/taskFilter";

interface TaskFilterControlProps {
  filter: TaskFilter;
  onChange: (filter: TaskFilter) => void;
  /** 担当者の選択肢（表示名） */
  assignees: { id: number; name: string }[];
}

// 配列内の値をトグルする（存在すれば除去、なければ追加）
function toggle<T>(values: T[], value: T): T[] {
  return values.includes(value)
    ? values.filter((v) => v !== value)
    : [...values, value];
}

/**
 * ガントのタスク絞り込みUI（ポップオーバー）。
 * タスク名（部分一致/正規表現・複数語）、ステータス、担当者で絞り込む。
 */
export function TaskFilterControl({
  filter,
  onChange,
  assignees,
}: TaskFilterControlProps) {
  const activeCount = countActiveFilters(filter);
  const regexInvalid =
    filter.keywordMode === "regex" && !isValidRegex(filter.keyword);

  // 担当者選択肢（重複除去 + 末尾に「未割当」）
  const assigneeOptions = useMemo(() => {
    const names = assignees.map((a) => a.name).filter((n) => n.length > 0);
    return [...new Set([...names, UNASSIGNED_LABEL])];
  }, [assignees]);

  const setKeyword = (keyword: string) => onChange({ ...filter, keyword });
  const setKeywordMode = (keywordMode: KeywordMode) =>
    onChange({ ...filter, keywordMode });
  const toggleStatus = (status: TaskStatus) =>
    onChange({ ...filter, statuses: toggle(filter.statuses, status) });
  const toggleAssignee = (name: string) =>
    onChange({ ...filter, assignees: toggle(filter.assignees, name) });
  const clearAll = () => onChange(EMPTY_TASK_FILTER);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant={activeCount > 0 ? "default" : "outline"}
          size="sm"
          className="gap-2"
          title="タスクの絞り込み"
          data-testid="gantt-filter-trigger"
        >
          <Filter className="h-4 w-4" />
          フィルタ
          {activeCount > 0 && (
            <Badge
              variant="secondary"
              className="ml-1 h-5 min-w-5 justify-center px-1 tabular-nums"
              data-testid="gantt-filter-count"
            >
              {activeCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold">タスクの絞り込み</span>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 gap-1 px-2 text-xs"
              onClick={clearAll}
              disabled={activeCount === 0}
              data-testid="gantt-filter-clear"
            >
              <X className="h-3 w-3" />
              クリア
            </Button>
          </div>

          {/* タスク名検索 */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label
                htmlFor="gantt-filter-keyword"
                className="text-xs font-medium text-muted-foreground"
              >
                タスク名
              </label>
              <div className="flex overflow-hidden rounded-md border text-xs">
                {(
                  [
                    ["partial", "部分一致"],
                    ["regex", "正規表現"],
                  ] as const
                ).map(([mode, label]) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setKeywordMode(mode)}
                    className={`px-2 py-0.5 transition-colors ${
                      filter.keywordMode === mode
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted hover:bg-muted/80"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <Input
              id="gantt-filter-keyword"
              value={filter.keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder={
                filter.keywordMode === "regex"
                  ? "正規表現（例: 実装.*A）"
                  : "部分一致（空白/カンマ区切りで複数指定）"
              }
              className="h-8"
              aria-invalid={regexInvalid}
              data-testid="gantt-filter-keyword"
            />
            {regexInvalid && (
              <p className="text-xs text-destructive">
                正規表現が不正です
              </p>
            )}
          </div>

          {/* ステータス */}
          <div className="space-y-2">
            <span className="text-xs font-medium text-muted-foreground">
              ステータス
            </span>
            <div className="grid grid-cols-2 gap-1.5">
              {TASK_STATUSES.map((status) => (
                <label
                  key={status}
                  className="flex cursor-pointer items-center gap-2 text-sm"
                >
                  <Checkbox
                    checked={filter.statuses.includes(status)}
                    onCheckedChange={() => toggleStatus(status)}
                  />
                  <span>{getTaskStatusName(status)}</span>
                </label>
              ))}
            </div>
          </div>

          {/* 担当者 */}
          {assigneeOptions.length > 0 && (
            <div className="space-y-2">
              <span className="text-xs font-medium text-muted-foreground">
                担当者
              </span>
              <div className="max-h-40 space-y-1.5 overflow-y-auto pr-1">
                {assigneeOptions.map((name) => (
                  <label
                    key={name}
                    className="flex cursor-pointer items-center gap-2 text-sm"
                  >
                    <Checkbox
                      checked={filter.assignees.includes(name)}
                      onCheckedChange={() => toggleAssignee(name)}
                    />
                    <span className="min-w-0 truncate">{name}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
