"use client";

import React from "react";
import { Milestone, TaskStatus, WbsTask } from "@/types/wbs";
import { GroupBy } from "./gantt-controls";
import { formatDateyyyymmdd } from "@/lib/utils";
import { Target } from "lucide-react";
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

interface TimeInterval {
  date: Date;
  position: number;
  width: number;
}

interface MilestoneWithPosition extends Milestone {
  position: number;
}

interface GanttChartProps {
  timeAxis: TimeInterval[];
  chartWidth: number;
  groups: TaskGroup[];
  groupBy: GroupBy;
  milestonesWithPosition: MilestoneWithPosition[];
  chartScrollRef: React.RefObject<HTMLDivElement | null>;
  onScroll: () => void;
}

export default function GanttChart({
  timeAxis,
  chartWidth,
  groups,
  groupBy,
  milestonesWithPosition,
  chartScrollRef,
  onScroll,
}: GanttChartProps) {
  const getStatusColor = (status: TaskStatus) => {
    switch (status) {
      case "NOT_STARTED":
        return "bg-gray-400";
      case "IN_PROGRESS":
        return "bg-blue-500";
      case "COMPLETED":
        return "bg-green-500";
      default:
        return "bg-gray-400";
    }
  };

  return (
    <div ref={chartScrollRef} className="overflow-auto" onScroll={onScroll}>
      <div
        className="relative"
        style={{ width: `${chartWidth}px`, minWidth: "100%" }}
      >
        {/* グリッド線 */}
        {timeAxis.map((interval, index) => (
          <div
            key={index}
            className="absolute top-0 bottom-0 border-r border-gray-200"
            style={{ left: `${interval.position}px` }}
          />
        ))}

        {/* マイルストーン */}
        {milestonesWithPosition.map((milestone) => (
          <div
            key={milestone.id}
            className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-20"
            style={{ left: `${milestone.position}px` }}
          >
            <div className="absolute top-0 -left-2">
              <Target className="h-4 w-4 text-red-500" />
            </div>
            <div className="absolute top-5 -left-10 text-xs text-red-600 font-medium whitespace-nowrap">
              {milestone.name}
            </div>
          </div>
        ))}

        {/* タスクバー */}
        <div className="space-y-0">
          {groups.map((group) => (
            <div key={group.id}>
              {groupBy !== "none" && (
                <div className="h-8 bg-gray-100 border-b border-gray-200" />
              )}

              {!group.collapsed &&
                group.tasks.map((task) => (
                  <div
                    key={task.id}
                    className="h-12 border-b border-gray-200 relative hover:bg-gray-50"
                  >
                    {task.yoteiStart && task.yoteiEnd && (
                      <div
                        className={cn(
                          "absolute top-2 h-8 rounded-md shadow-sm flex items-center px-2 text-white text-xs font-medium",
                          getStatusColor(task.status)
                        )}
                        style={{
                          left: `${task.startPosition}px`,
                          width: `${Math.max(task.width, 20)}px`,
                        }}
                        title={`${task.name} (${formatDateyyyymmdd(
                          task.yoteiStart.toISOString()
                        )} - ${formatDateyyyymmdd(
                          task.yoteiEnd.toISOString()
                        )})`}
                      >
                        <span className="truncate">
                          {task.width > 50 && task.name}
                        </span>
                      </div>
                    )}
                  </div>
                ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
