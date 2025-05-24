"use client";

import { ChangeEvent, useState } from "react";
import { Button } from "../ui/button";
import { parse } from "csv-parse/sync";
import { generateSchedule } from "@/app/schedule-generator/action";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { ProjectStatus } from "@/types/wbs";
import { formatDateyyyymmdd, getProjectStatusName } from "@/lib/utils";

type ScheduleItem = {
  date: string;
  taskName: string;
  hours: number;
};

type ScheduleResult = {
  success: boolean;
  error?: string;
  schedule?: { [assigneeId: string]: ScheduleItem[] };
};

type TaskSummary = {
  taskName: string;
  assigneeId: string;
  startDate: string;
  endDate: string;
  totalHours: number;
};

export function ScheduleGenerator({
  projects,
}: {
  projects: {
    id: string;
    name: string;
    status: ProjectStatus;
    startDate: Date;
    endDate: Date;
  }[];
}) {
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [scheduleResult, setScheduleResult] = useState<ScheduleResult | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(false);

  const selectedProject = projects.find((p) => p.id === selectedProjectId);

  // CSVアップロード
  const handleCsvUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedProjectId) return;

    setIsLoading(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result;
        const csv = parse(text as string, {
          columns: true,
          skip_empty_lines: true,
        });
        const schedule = await generateSchedule(csv, Number(selectedProjectId));
        setScheduleResult(schedule);
      } catch (error) {
        console.error("CSV処理エラー:", error);
        setScheduleResult({
          success: false,
          error: "CSVの処理中にエラーが発生しました",
        });
      } finally {
        setIsLoading(false);
      }
    };
    reader.readAsText(file);
  };

  // スケジュールをタスクに変換
  const convertToTaskSummary = (schedule: {
    [assigneeId: string]: ScheduleItem[];
  }): TaskSummary[] => {
    const taskMap = new Map<string, TaskSummary>();

    Object.entries(schedule).forEach(([assigneeId, scheduleItems]) => {
      scheduleItems.forEach((item) => {
        const key = `${item.taskName}-${assigneeId}`;

        if (taskMap.has(key)) {
          const existing = taskMap.get(key)!;
          existing.totalHours += item.hours;
          existing.startDate =
            item.date < existing.startDate ? item.date : existing.startDate;
          existing.endDate =
            item.date > existing.endDate ? item.date : existing.endDate;
        } else {
          taskMap.set(key, {
            taskName: item.taskName,
            assigneeId,
            startDate: item.date,
            endDate: item.date,
            totalHours: item.hours,
          });
        }
      });
    });

    return Array.from(taskMap.values()).sort((a, b) => {
      if (a.startDate !== b.startDate) {
        return a.startDate.localeCompare(b.startDate);
      }
      return a.taskName.localeCompare(b.taskName);
    });
  };

  // スケジュールテーブルをレンダリング
  const renderScheduleTable = () => {
    if (!scheduleResult) return null;

    if (!scheduleResult.success) {
      return (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded">
          <p className="text-red-700">エラー: {scheduleResult.error}</p>
        </div>
      );
    }

    if (
      !scheduleResult.schedule ||
      Object.keys(scheduleResult.schedule).length === 0
    ) {
      return (
        <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded">
          <p className="text-yellow-700">スケジュールデータがありません</p>
        </div>
      );
    }

    const taskSummaries = convertToTaskSummary(scheduleResult.schedule);

    return (
      <div className="mt-8">
        <h3 className="text-lg font-semibold mb-4">生成されたスケジュール</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full border border-gray-300">
            <thead className="bg-gray-50">
              <tr>
                <th className="border border-gray-300 px-4 py-2 text-left">
                  タスク
                </th>
                <th className="border border-gray-300 px-4 py-2 text-left">
                  担当者
                </th>
                <th className="border border-gray-300 px-4 py-2 text-left">
                  開始日
                </th>
                <th className="border border-gray-300 px-4 py-2 text-left">
                  終了日
                </th>
                <th className="border border-gray-300 px-4 py-2 text-right">
                  工数
                </th>
              </tr>
            </thead>
            <tbody>
              {taskSummaries.map((task, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="border border-gray-300 px-4 py-2">
                    {task.taskName}
                  </td>
                  <td className="border border-gray-300 px-4 py-2">
                    {task.assigneeId}
                  </td>
                  <td className="border border-gray-300 px-4 py-2">
                    {task.startDate}
                  </td>
                  <td className="border border-gray-300 px-4 py-2">
                    {task.endDate}
                  </td>
                  <td className="border border-gray-300 px-4 py-2 text-right">
                    {task.totalHours}h
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* プロジェクト選択とCSVアップロード */}
      <div className="flex flex-col gap-4">
        <div className="flex gap-4 items-center">
          <Select
            value={selectedProjectId}
            onValueChange={(value) => setSelectedProjectId(value)}
          >
            <SelectTrigger className="w-60">
              <SelectValue placeholder="プロジェクトを選択" />
            </SelectTrigger>
            <SelectContent>
              {projects.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <label>
            <input
              type="file"
              accept=".csv"
              style={{ display: "none" }}
              onChange={handleCsvUpload}
              disabled={!selectedProjectId || isLoading}
            />
            <Button disabled={!selectedProjectId || isLoading}>
              {isLoading ? "処理中..." : "CSVアップロード"}
            </Button>
          </label>
        </div>
      </div>

      {/* 選択されたプロジェクトの情報 */}
      {selectedProject && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="text-lg font-semibold mb-3 text-blue-800">
            プロジェクト情報
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex flex-col">
              <span className="text-sm font-medium text-gray-600">
                プロジェクト名
              </span>
              <span className="text-base">{selectedProject.name}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-medium text-gray-600">開始日</span>
              <span className="text-base">
                {formatDateyyyymmdd(selectedProject.startDate.toString())}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-medium text-gray-600">終了日</span>
              <span className="text-base">
                {formatDateyyyymmdd(selectedProject.endDate.toString())}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-medium text-gray-600">
                ステータス
              </span>
              <span className="text-base">
                {getProjectStatusName(selectedProject.status)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 生成されたスケジュール */}
      {renderScheduleTable()}
    </div>
  );
}
