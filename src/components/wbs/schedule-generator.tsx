"use client";

import { ChangeEvent, useState, useRef } from "react";
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
import { toast } from "@/hooks/use-toast";

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
    wbs: {
      id: number;
      name: string;
      assignees: {
        id: number;
        userId: string;
        name: string;
      }[];
    }[];
  }[];
}) {
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [selectedWbsId, setSelectedWbsId] = useState<string>("");
  const [scheduleResult, setScheduleResult] = useState<ScheduleResult | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const selectedProject = projects.find((p) => p.id === selectedProjectId);
  const selectedWbs = selectedProject?.wbs.find(
    (wbs) => wbs.id === Number(selectedWbsId)
  );

  // CSVアップロード
  const handleCsvUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedWbsId) return;

    setIsLoading(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result;
        const csv = parse(text as string, {
          columns: true,
          skip_empty_lines: true,
        });
        const schedule = await generateSchedule(csv, Number(selectedWbsId));
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

  // ファイル選択ボタンをクリック
  const handleFileButtonClick = () => {
    fileInputRef.current?.click();
  };

  // CSVテンプレートをダウンロード
  const handleDownloadTemplate = () => {
    if (!selectedWbs) return;

    // selectedWbsから taskCsvData 形式のテンプレートデータを生成（担当者IDのみ記載）
    const csvData = selectedWbs.assignees.map((assignee) => ({
      name: "",
      assigneeId: assignee.userId,
      phaseId: "",
      kosu: "",
    }));

    // CSVヘッダー
    const headers = ["name", "assigneeId", "phaseId", "kosu"];

    // CSV文字列を生成
    const csvContent = [
      headers.join(","),
      ...csvData.map((row) =>
        [row.name, row.assigneeId, row.phaseId, row.kosu].join(",")
      ),
    ].join("\n");

    // BOMを追加してExcelで文字化けを防ぐ
    const bom = "\uFEFF";
    const blob = new Blob([bom + csvContent], {
      type: "text/csv;charset=utf-8;",
    });

    // ダウンロードリンクを作成
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `${selectedWbs.name}_schedule-generator-template.csv`
    );
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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

  // スケジュールをTSV形式でクリップボードにコピー
  const handleCopyToClipboard = async () => {
    if (!scheduleResult?.schedule) return;

    const taskSummaries = convertToTaskSummary(scheduleResult.schedule);

    // TSVヘッダー
    const headers = ["タスク", "担当者", "開始日", "終了日", "工数"];

    // TSVデータ行
    const dataRows = taskSummaries.map((task) => [
      task.taskName,
      task.assigneeId,
      task.startDate,
      task.endDate,
      `${task.totalHours}h`,
    ]);

    // TSV形式に変換（タブ区切り）
    const tsvContent = [
      headers.join("\t"),
      ...dataRows.map((row) => row.join("\t")),
    ].join("\n");

    try {
      await navigator.clipboard.writeText(tsvContent);
      toast({
        title: "コピー完了",
        description: "スケジュールをクリップボードにコピーしました",
      });
    } catch (err) {
      console.error("クリップボードへのコピーに失敗しました:", err);
      toast({
        title: "コピー失敗",
        description: "クリップボードへのコピーに失敗しました",
        variant: "destructive",
      });
    }
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
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">生成されたスケジュール</h3>
          <Button
            onClick={handleCopyToClipboard}
            disabled={!scheduleResult?.schedule}
            variant="outline"
            size="sm"
          >
            TSV形式でコピー
          </Button>
        </div>
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

          <Select
            value={selectedWbsId}
            onValueChange={(value) => setSelectedWbsId(value)}
            disabled={!selectedProjectId}
          >
            <SelectTrigger className="w-60" disabled={!selectedProjectId}>
              <SelectValue placeholder="WBSを選択" />
            </SelectTrigger>
            <SelectContent>
              {selectedProject?.wbs.map((wbs) => (
                <SelectItem key={wbs.id} value={wbs.id.toString()}>
                  {wbs.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            style={{ display: "none" }}
            onChange={handleCsvUpload}
            disabled={!selectedWbsId || isLoading}
          />
          <Button
            onClick={handleFileButtonClick}
            disabled={!selectedProjectId || isLoading}
          >
            {isLoading ? "処理中..." : "CSVアップロード"}
          </Button>

          <Button
            onClick={handleDownloadTemplate}
            disabled={!selectedWbsId}
            variant="outline"
          >
            CSVテンプレートダウンロード
          </Button>
        </div>
      </div>

      {/* 選択されたプロジェクトの情報 */}
      {selectedProject && (
        <>
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
                <span className="text-sm font-medium text-gray-600">
                  開始日
                </span>
                <span className="text-base">
                  {formatDateyyyymmdd(selectedProject.startDate.toString())}
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-medium text-gray-600">
                  終了日
                </span>
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
          {selectedWbs && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="text-lg font-semibold mb-3 text-blue-800">
                WBS情報
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-gray-600">
                    WBS名
                  </span>
                  <span className="text-base">{selectedWbs?.name}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-gray-600">
                    担当者
                  </span>
                  <span className="text-base">
                    {selectedWbs.assignees
                      .map((assignee) => assignee.name)
                      .join(", ")}
                  </span>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* 生成されたスケジュール */}
      {renderScheduleTable()}
    </div>
  );
}
