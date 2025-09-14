"use client";

import { useState, useMemo } from "react";
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  addMonths,
  subMonths,
  isToday,
  startOfWeek,
  endOfWeek,
  isSameMonth,
} from "date-fns";
import { ja } from "date-fns/locale";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Clock,
  MapPin,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

interface User {
  id: string;
  name: string;
  email: string;
}

interface ScheduleEntry {
  id: number;
  userId: string;
  name: string;
  date: Date;
  startTime: string;
  endTime: string;
  title: string;
  location?: string;
  description?: string;
}

interface ModernCalendarProps {
  schedules: ScheduleEntry[];
  users: User[];
}

// User colors for different users
const USER_COLORS = [
  "bg-blue-500",
  "bg-green-500",
  "bg-purple-500",
  "bg-orange-500",
  "bg-pink-500",
  "bg-indigo-500",
  "bg-yellow-500",
  "bg-red-500",
  "bg-teal-500",
  "bg-cyan-500",
];

const USER_LIGHT_COLORS = [
  "bg-blue-100 text-blue-800",
  "bg-green-100 text-green-800",
  "bg-purple-100 text-purple-800",
  "bg-orange-100 text-orange-800",
  "bg-pink-100 text-pink-800",
  "bg-indigo-100 text-indigo-800",
  "bg-yellow-100 text-yellow-800",
  "bg-red-100 text-red-800",
  "bg-teal-100 text-teal-800",
  "bg-cyan-100 text-cyan-800",
];

export function ModernCalendar({ schedules, users }: ModernCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(() =>
    startOfMonth(new Date())
  );
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Create user color mapping
  const userColorMap = useMemo(() => {
    const map = new Map<string, { color: string; lightColor: string }>();
    users.forEach((user, index) => {
      map.set(user.id, {
        color: USER_COLORS[index % USER_COLORS.length],
        lightColor: USER_LIGHT_COLORS[index % USER_LIGHT_COLORS.length],
      });
    });
    return map;
  }, [users]);

  // Get calendar dates (including leading/trailing dates from adjacent months)
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 }); // Sunday
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
  const calendarDays = eachDayOfInterval({
    start: calendarStart,
    end: calendarEnd,
  });

  // Group schedules by date
  const schedulesByDate = useMemo(() => {
    const grouped: { [date: string]: ScheduleEntry[] } = {};
    schedules.forEach((schedule) => {
      const dateKey = format(new Date(schedule.date), "yyyy-MM-dd");
      if (!grouped[dateKey]) grouped[dateKey] = [];
      grouped[dateKey].push(schedule);
    });
    return grouped;
  }, [schedules]);

  // Get schedules for selected date
  const selectedDateSchedules = useMemo(() => {
    if (!selectedDate) return [];
    const dateKey = format(selectedDate, "yyyy-MM-dd");
    return schedulesByDate[dateKey] || [];
  }, [selectedDate, schedulesByDate]);

  const navigateMonth = (direction: "prev" | "next") => {
    setCurrentMonth((prev) =>
      direction === "prev" ? subMonths(prev, 1) : addMonths(prev, 1)
    );
  };

  const handleDateClick = (date: Date) => {
    setSelectedDate(date);
    setIsSidebarOpen(true);
  };

  return (
    <div className="flex h-screen bg-gray-50 mx-8">
      {/* Main Calendar */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <h1 className="text-2xl font-semibold text-gray-900">
                {format(currentMonth, "yyyy年M月", { locale: ja })}
              </h1>
              <div className="flex items-center space-x-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigateMonth("prev")}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigateMonth("next")}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
            <Button
              variant="outline"
              onClick={() => setCurrentMonth(startOfMonth(new Date()))}
            >
              今日
            </Button>
          </div>
        </div>

        {/* Calendar Grid */}
        <div className="flex-1 p-6">
          <div className="h-full">
            {/* Days of week header */}
            <div className="grid grid-cols-7 gap-px mb-1">
              {["日", "月", "火", "水", "木", "金", "土"].map((day, index) => (
                <div
                  key={day}
                  className={`py-2 text-center text-sm font-medium ${
                    index === 0
                      ? "text-red-600"
                      : index === 6
                      ? "text-blue-600"
                      : "text-gray-700"
                  }`}
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar Days */}
            <div
              className="grid grid-cols-7 gap-px bg-gray-200 rounded-lg overflow-hidden flex-1"
              style={{ height: "calc(100% - 3rem)" }}
            >
              {calendarDays.map((date) => {
                const dateKey = format(date, "yyyy-MM-dd");
                const daySchedules = schedulesByDate[dateKey] || [];
                const isCurrentMonth = isSameMonth(date, currentMonth);
                const isCurrentDay = isToday(date);

                return (
                  <div
                    key={dateKey}
                    className={`bg-white p-2 min-h-[120px] overflow-hidden cursor-pointer hover:bg-gray-50 transition-colors ${
                      !isCurrentMonth ? "bg-gray-50" : ""
                    }`}
                    onClick={() => handleDateClick(date)}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span
                        className={`text-sm font-medium ${
                          isCurrentDay
                            ? "bg-blue-600 text-white w-6 h-6 rounded-full flex items-center justify-center"
                            : !isCurrentMonth
                            ? "text-gray-400"
                            : date.getDay() === 0
                            ? "text-red-600"
                            : date.getDay() === 6
                            ? "text-blue-600"
                            : "text-gray-900"
                        }`}
                      >
                        {date.getDate()}
                      </span>
                    </div>

                    <div className="space-y-1">
                      {daySchedules.slice(0, 3).map((schedule) => {
                        const colors = userColorMap.get(schedule.userId);
                        return (
                          <div
                            key={schedule.id}
                            className={`px-2 py-1 rounded text-xs font-medium truncate ${
                              colors?.lightColor || "bg-gray-100 text-gray-800"
                            }`}
                            title={`${schedule.title} (${schedule.name})`}
                          >
                            {schedule.startTime && (
                              <span className="mr-1">{schedule.startTime}</span>
                            )}
                            {schedule.title}
                          </div>
                        );
                      })}
                      {daySchedules.length > 3 && (
                        <div className="text-xs text-gray-500 px-2">
                          +{daySchedules.length - 3} 他
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Schedule Details Sidebar */}
      {isSidebarOpen && (
        <div className="w-96 bg-white border-l border-gray-200 p-6 overflow-y-auto">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900">
              {selectedDate &&
                format(selectedDate, "yyyy年M月d日（E）", { locale: ja })}
            </h2>
            <button
              onClick={() => setIsSidebarOpen(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          </div>

          {selectedDateSchedules.length > 0 ? (
            <div className="space-y-4">
              {selectedDateSchedules.map((schedule) => {
                const colors = userColorMap.get(schedule.userId);
                return (
                  <div
                    key={schedule.id}
                    className="border rounded-lg p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-medium text-gray-900">
                        {schedule.title}
                      </h3>
                      <div
                        className={`w-3 h-3 rounded-full ${
                          colors?.color || "bg-gray-400"
                        }`}
                      />
                    </div>

                    {/* Time */}
                    {schedule.startTime && schedule.endTime && (
                      <div className="flex items-center space-x-1 text-sm text-gray-600 mb-2">
                        <Clock className="w-4 h-4" />
                        <span>
                          {schedule.startTime} - {schedule.endTime}
                        </span>
                      </div>
                    )}

                    {/* User */}
                    <div className="flex items-center space-x-1 text-sm text-gray-600 mb-2">
                      <User className="w-4 h-4" />
                      <span>{schedule.name}</span>
                    </div>

                    {/* Location */}
                    {schedule.location && (
                      <div className="flex items-center space-x-1 text-sm text-gray-600 mb-2">
                        <MapPin className="w-4 h-4" />
                        <span>{schedule.location}</span>
                      </div>
                    )}

                    {/* Description */}
                    {schedule.description && (
                      <div className="mt-3 pt-3 border-t">
                        <p className="text-sm text-gray-600 whitespace-pre-wrap">
                          {schedule.description}
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-gray-500 text-center mt-8">
              この日の予定はありません
            </p>
          )}

          <div className="mt-6">
            <Link href="/schedule/import">
              <Button className="w-full justify-center" size="lg">
                <Plus className="w-4 h-4 mr-2" />
                インポート
              </Button>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
