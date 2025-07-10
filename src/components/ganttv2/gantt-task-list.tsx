"use client";

import React from "react";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@radix-ui/react-scroll-area";
import { WbsTask } from "@/types/wbs";
import { GroupBy } from "./gantt-controls";
import { getTaskStatusName } from "@/lib/utils";
import {
  ChevronDown,
  ChevronRight,
  User,
  Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface TaskWithPosition extends WbsTask {
  startPosition: number;
  width: number;
  groupId?: string;
}

interface TaskGroup {
  id: string;
  name: string;
  tasks: TaskWithPosition[];
  collapsed: boolean;
}

interface GanttTaskListProps {
  groups: TaskGroup[];
  groupBy: GroupBy;
  onToggleGroup: (groupId: string) => void;
}

export default function GanttTaskList({
  groups,
  groupBy,
  onToggleGroup,
}: GanttTaskListProps) {
  return (
    <div className="w-80 border-r border-gray-200 bg-gray-50 flex-shrink-0">
      {/* ヘッダー */}
      <div className="h-12 border-b border-gray-200 flex items-center px-4 bg-gray-100 font-semibold text-sm">
        タスク一覧
      </div>

      {/* タスクリスト */}
      <ScrollArea className="h-96">
        {groups.map((group) => (
          <div key={group.id}>
            {groupBy !== "none" && (
              <div
                className="h-8 px-4 bg-gray-100 border-b border-gray-200 flex items-center cursor-pointer hover:bg-gray-200"
                onClick={() => onToggleGroup(group.id)}
              >
                {group.collapsed ? (
                  <ChevronRight className="h-4 w-4 mr-2" />
                ) : (
                  <ChevronDown className="h-4 w-4 mr-2" />
                )}
                <span className="text-sm font-medium">{group.name}</span>
                <Badge variant="secondary" className="ml-2 text-xs">
                  {group.tasks.length}
                </Badge>
              </div>
            )}

            {!group.collapsed &&
              group.tasks.map((task) => (
                <div
                  key={task.id}
                  className="h-12 px-4 border-b border-gray-200 flex items-center hover:bg-gray-50"
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">
                      {task.name}
                    </div>
                    <div className="text-xs text-gray-500 flex items-center gap-2">
                      {task.assignee && (
                        <span className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {task.assignee.displayName}
                        </span>
                      )}
                      {task.yoteiKosu && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {task.yoteiKosu}h
                        </span>
                      )}
                    </div>
                  </div>
                  <Badge
                    variant={
                      task.status === "COMPLETED" ? "default" : "secondary"
                    }
                    className={cn(
                      "text-xs",
                      task.status === "COMPLETED" &&
                        "bg-green-100 text-green-800",
                      task.status === "IN_PROGRESS" &&
                        "bg-blue-100 text-blue-800",
                      task.status === "NOT_STARTED" &&
                        "bg-gray-100 text-gray-800"
                    )}
                  >
                    {getTaskStatusName(task.status)}
                  </Badge>
                </div>
              ))}
          </div>
        ))}
      </ScrollArea>
    </div>
  );
}