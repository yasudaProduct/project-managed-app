"use client";

import { cn } from "@/utils/utils";

interface GanttHeaderProps {
  dateRange: Date[];
  onDateClick?: (date: Date) => void;
}

export function GanttHeader({ dateRange, onDateClick }: GanttHeaderProps) {
  const isWeekend = (date: Date) => {
    const dayOfWeek = date.getDay();
    return dayOfWeek === 0 || dayOfWeek === 6;
  };

  const formatDate = (date: Date) => {
    return {
      month: date.toLocaleDateString("ja-JP", { month: "short" }),
      day: date.getDate(),
      weekday: date.toLocaleDateString("ja-JP", { weekday: "short" }),
    };
  };

  return (
    <div className="sticky top-0 z-20 bg-white border-b border-gray-300">
      {/* 月表示行 */}
      <div className="flex border-b border-gray-200">
        <div className="w-32 bg-gray-50 border-r border-gray-300 flex items-center justify-center font-semibold text-sm h-8">
          担当者
        </div>
        {(() => {
          const monthGroups: { month: string; count: number }[] = [];
          let currentMonth = "";
          let count = 0;

          dateRange.forEach((date) => {
            const monthStr = formatDate(date).month;
            if (monthStr !== currentMonth) {
              if (count > 0) {
                monthGroups.push({ month: currentMonth, count });
              }
              currentMonth = monthStr;
              count = 1;
            } else {
              count++;
            }
          });

          if (count > 0) {
            monthGroups.push({ month: currentMonth, count });
          }

          return monthGroups.map((group, index) => (
            <div
              key={index}
              className="bg-gray-50 border-r border-gray-200 flex items-center justify-center font-semibold text-sm h-8"
              style={{ minWidth: `${group.count * 60}px` }}
            >
              {group.month}
            </div>
          ));
        })()}
      </div>

      {/* 日付表示行 */}
      <div className="flex">
        <div className="w-32 bg-gray-50 border-r border-gray-300"></div>
        {dateRange.map((date, index) => {
          const dateInfo = formatDate(date);
          const weekend = isWeekend(date);

          return (
            <div
              key={index}
              className={cn(
                "min-w-[60px] h-12 border-r border-gray-200 flex flex-col items-center justify-center cursor-pointer transition-colors text-xs",
                weekend
                  ? "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  : "bg-gray-50 text-gray-800 hover:bg-gray-100"
              )}
              onClick={() => onDateClick?.(date)}
            >
              <div className="font-semibold">{dateInfo.day}</div>
              <div
                className={cn(
                  "text-[10px]",
                  weekend ? "text-red-500 font-medium" : "text-gray-500"
                )}
              >
                {dateInfo.weekday}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
