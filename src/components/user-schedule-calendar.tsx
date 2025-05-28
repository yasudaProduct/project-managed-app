"use client";

import { useState, useMemo } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  getDay,
  addMonths,
  subMonths,
} from "date-fns";

type ScheduleEntry = {
  id: number;
  userId: string;
  name: string;
  date: Date;
  startTime: string;
  endTime: string;
  title: string;
  location?: string;
  description?: string;
};

export type UserScheduleCalendarProps = {
  schedules: ScheduleEntry[];
};

export function UserScheduleCalendar({ schedules }: UserScheduleCalendarProps) {
  // ユーザー一覧
  const users = useMemo(
    () =>
      Array.from(
        new Map(schedules.map((s) => [s.userId, s.name])).entries()
      ).map(([userId, name]) => ({ userId, name })),
    [schedules]
  );

  const [selectedUser, setSelectedUser] = useState(users[0]?.userId ?? "");
  const [currentMonth, setCurrentMonth] = useState(() =>
    startOfMonth(new Date())
  );

  // 選択ユーザーの予定
  const userSchedules = schedules.filter((s) => s.userId === selectedUser);

  // 今表示中の月の日付リスト
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // 日付ごとに予定をグループ化
  const scheduleByDate: { [date: string]: ScheduleEntry[] } = {};
  userSchedules.forEach((s) => {
    const ymd = format(new Date(s.date), "yyyy-MM-dd");
    if (!scheduleByDate[ymd]) scheduleByDate[ymd] = [];
    scheduleByDate[ymd].push(s);
  });

  return (
    <div>
      <div className="mb-4 flex gap-4 items-center">
        <span>ユーザー選択:</span>
        <Select value={selectedUser} onValueChange={setSelectedUser}>
          <SelectTrigger className="w-60">
            <SelectValue placeholder="ユーザーを選択" />
          </SelectTrigger>
          <SelectContent>
            {users.map((u) => (
              <SelectItem key={u.userId} value={u.userId}>
                {u.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex items-center gap-2 ml-8">
          <button
            className="px-2 py-1 border rounded"
            onClick={() => setCurrentMonth((prev) => subMonths(prev, 1))}
          >
            ←
          </button>
          <span className="font-bold">
            {format(currentMonth, "yyyy年MM月")}
          </span>
          <button
            className="px-2 py-1 border rounded"
            onClick={() => setCurrentMonth((prev) => addMonths(prev, 1))}
          >
            →
          </button>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-2 border rounded-lg p-2 bg-white">
        {/* 曜日ヘッダー */}
        {["日", "月", "火", "水", "木", "金", "土"].map((w) => (
          <div key={w} className="font-bold text-center border-b pb-1">
            {w}
          </div>
        ))}
        {/* 空白セル（1日目の曜日まで） */}
        {Array(getDay(monthStart))
          .fill(0)
          .map((_, i) => (
            <div key={`empty-${i}`} />
          ))}
        {/* 日付セル */}
        {days.map((date) => {
          const ymd = format(date, "yyyy-MM-dd");
          const daySchedules = scheduleByDate[ymd] || [];

          return (
            <div
              key={ymd}
              className="min-h-[80px] border rounded p-1 flex flex-col bg-blue-50"
            >
              <div className="text-xs font-bold">{date.getDate()}</div>
              {daySchedules.map((s) => (
                <div
                  key={s.id}
                  className="mt-1 text-xs bg-white rounded px-1 py-0.5 border"
                >
                  <div className="font-semibold">{s.title}</div>
                  <div>
                    {s.startTime} - {s.endTime}
                  </div>
                  <div className="text-gray-500">{s.location}</div>
                  <div className="text-gray-400">{s.description}</div>
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
