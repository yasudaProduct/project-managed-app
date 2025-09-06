"use client";

import { GanttCell } from "./gantt-cell";
import { cn } from "@/lib/utils";

// UI用のデータ型定義
interface TaskAllocationUI {
  taskId: string;
  taskName: string;
  allocatedHours: number;
}

interface DailyWorkAllocationUI {
  date: Date;
  availableHours: number;
  taskAllocations: TaskAllocationUI[];
  allocatedHours: number;
  isOverloaded: boolean;
  utilizationRate: number;
  overloadedHours: number;
  isWeekend: boolean;
  isCompanyHoliday: boolean;
  userSchedules: {
    title: string;
    startTime: string;
    endTime: string;
    durationHours: number;
  }[];
  isOverloadedByStandard: boolean;
  overloadedByStandardHours: number;
  isOverRateCapacity: boolean;
  overRateHours: number;
}

interface AssigneeWorkloadUI {
  assigneeId: string;
  assigneeName: string;
  dailyAllocations: DailyWorkAllocationUI[];
  overloadedDays: DailyWorkAllocationUI[];
}

interface GanttRowProps {
  assignee: AssigneeWorkloadUI;
  dateRange: Date[];
  onCellClick?: (assignee: string, date: Date) => void;
  warningDates?: Set<string>; // YYYY-MM-DD セット
}

export function GanttRow({
  assignee,
  dateRange,
  onCellClick,
  warningDates,
}: GanttRowProps) {
  const isWeekend = (date: Date) => {
    const dayOfWeek = date.getDay();
    return dayOfWeek === 0 || dayOfWeek === 6;
  };

  const isHoliday = (date: Date) => {
    // デフォルトは土日。実データ側でisCompanyHolidayが優先される
    return isWeekend(date);
  };

  const handleCellClick = (allocation: DailyWorkAllocationUI) => {
    onCellClick?.(assignee.assigneeId, allocation.date);
  };

  const overloadedDays = assignee.overloadedDays;
  const hasOverload = overloadedDays.length > 0;

  return (
    <div className="flex border-b border-gray-200 hover:bg-gray-25 transition-colors">
      {/* 担当者名カラム */}
      <div
        className={cn(
          "w-32 p-3 bg-white border-r border-gray-300 flex items-center sticky left-0 z-10",
          hasOverload && "border-l-2 border-l-red-500"
        )}
      >
        <div className="flex flex-col">
          <div
            className={cn(
              "font-medium text-sm truncate",
              hasOverload && "text-red-700"
            )}
          >
            {assignee.assigneeName}
            {hasOverload && (
              <span
                className="ml-1 text-red-500 text-xs"
                title={`${overloadedDays.length}日間過負荷`}
              >
                ({overloadedDays.length})
              </span>
            )}
          </div>
          <div className="text-xs text-gray-500 truncate">
            {assignee.assigneeId}
          </div>
        </div>
      </div>

      {/* 日別セル */}
      {dateRange.map((date, index) => {
        // 日付に対応する配分を検索
        const allocation = assignee.dailyAllocations.find(
          (daily) => daily.date.toDateString() === date.toDateString()
        );

        // 配分が見つからない場合のデフォルト値
        const defaultAllocation: DailyWorkAllocationUI = {
          date: date,
          availableHours: isHoliday(date) ? 0 : 7.5,
          taskAllocations: [],
          allocatedHours: 0,
          isOverloaded: false,
          utilizationRate: 0,
          overloadedHours: 0,
          isWeekend: isWeekend(date),
          isCompanyHoliday: isHoliday(date),
          userSchedules: [],
          isOverloadedByStandard: false,
          overloadedByStandardHours: 0,
          isOverRateCapacity: false,
          overRateHours: 0,
        };

        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, "0");
        const d = String(date.getDate()).padStart(2, "0");
        const ymd = `${y}-${m}-${d}`;
        const showWarning = warningDates?.has(ymd) === true;

        return (
          <GanttCell
            key={index}
            allocation={allocation || defaultAllocation}
            isWeekend={(allocation || defaultAllocation).isWeekend}
            isHoliday={(allocation || defaultAllocation).isCompanyHoliday}
            showWarning={showWarning}
            onClick={handleCellClick}
          />
        );
      })}
    </div>
  );
}
