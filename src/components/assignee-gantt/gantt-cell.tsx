"use client";

import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

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
  userSchedules: { title: string; startTime: string; endTime: string; durationHours: number }[];
  isOverloadedByStandard: boolean;
  overloadedByStandardHours: number;
}

interface GanttCellProps {
  allocation: DailyWorkAllocationUI;
  isWeekend: boolean;
  isHoliday: boolean;
  onClick?: (allocation: DailyWorkAllocationUI) => void;
}

export function GanttCell({ allocation, isWeekend, isHoliday, onClick }: GanttCellProps) {
  const utilizationRate = allocation.utilizationRate;
  const isOverloaded = allocation.isOverloaded;
  const isOverloadedByStandard = allocation.isOverloadedByStandard;

  // 色分けロジック
  const getCellColor = () => {
    if (isHoliday || isWeekend) {
      return 'bg-gray-100 text-gray-400';
    }

    if (allocation.allocatedHours === 0) {
      return 'bg-white hover:bg-gray-50';
    }

    if (isOverloaded) {
      return 'bg-red-100 text-red-800 hover:bg-red-200';
    }

    if (utilizationRate >= 0.8) {
      return 'bg-orange-100 text-orange-800 hover:bg-orange-200';
    }

    if (utilizationRate >= 0.6) {
      return 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200';
    }

    return 'bg-green-100 text-green-800 hover:bg-green-200';
  };

  const formatHours = (hours: number) => {
    if (hours === 0) return '-';
    return hours.toFixed(1);
  };

  const cellContent = (
    <div
      className={cn(
        'h-8 min-w-[60px] border-r border-b border-gray-200 flex items-center justify-center text-xs font-medium cursor-pointer transition-colors',
        getCellColor(),
        onClick && 'hover:shadow-sm'
      )}
      onClick={() => onClick?.(allocation)}
    >
      <span>{formatHours(allocation.allocatedHours)}</span>
      {(isOverloaded || isOverloadedByStandard) && (
        <span className="ml-1 text-red-600 font-bold" title="過負荷">!</span>
      )}
    </div>
  );

  if (allocation.taskAllocations.length === 0) {
    return cellContent;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          {cellContent}
        </TooltipTrigger>
        <TooltipContent className="max-w-sm">
          <div className="space-y-2">
            <div className="font-semibold">
              {allocation.date.toLocaleDateString('ja-JP')}
            </div>
            
            <div className="space-y-1">
              <div className="text-xs">
                <span className="text-gray-500">予定工数:</span>
                <span className="ml-1 font-medium">{formatHours(allocation.allocatedHours)}h</span>
              </div>
              <div className="text-xs">
                <span className="text-gray-500">稼働可能時間:</span>
                <span className="ml-1 font-medium">{formatHours(allocation.availableHours)}h</span>
              </div>
              <div className="text-xs">
                <span className="text-gray-500">標準勤務時間:</span>
                <span className="ml-1 font-medium">7.5h</span>
              </div>
              <div className="text-xs">
                <span className="text-gray-500">稼働率:</span>
                <span className={cn(
                  "ml-1 font-medium",
                  isOverloaded ? "text-red-600" : "text-green-600"
                )}>
                  {(utilizationRate * 100).toFixed(1)}%
                </span>
              </div>
              {isOverloaded && (
                <div className="text-xs text-red-600 font-medium">
                  過負荷: +{allocation.overloadedHours.toFixed(1)}h
                </div>
              )}
              {isOverloadedByStandard && (
                <div className="text-xs text-red-600 font-medium">
                  標準超過: +{allocation.overloadedByStandardHours.toFixed(1)}h
                </div>
              )}
            </div>

            {allocation.taskAllocations.length > 0 && (
              <div className="border-t pt-2 space-y-1">
                <div className="text-xs font-medium">タスク詳細:</div>
                {allocation.taskAllocations.map((task, index) => (
                  <div key={index} className="text-xs">
                    <div className="font-medium">{task.taskName}</div>
                    <div className="text-gray-500 ml-2">
                      {task.allocatedHours.toFixed(1)}h
                    </div>
                  </div>
                ))}
              </div>
            )}

            {allocation.userSchedules && allocation.userSchedules.length > 0 && (
              <div className="border-t pt-2 space-y-1">
                <div className="text-xs font-medium">個人予定:</div>
                {allocation.userSchedules.map((s, i) => (
                  <div key={i} className="text-xs text-gray-600 flex justify-between">
                    <span className="mr-2">{s.title}</span>
                    <span>
                      {s.startTime} - {s.endTime} ({s.durationHours.toFixed(1)}h)
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}