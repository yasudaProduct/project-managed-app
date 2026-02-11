"use client";

import { ChangeEvent, useState, useRef, useEffect } from "react";
import { Button } from "../../components/ui/button";
import { parse } from "csv-parse/sync";
import {
  generateSchedule,
  getOperationPossible,
} from "@/app/schedule-generator/action";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import { ProjectStatus } from "@/types/wbs";
import { getProjectStatusName } from "@/utils/utils";
import { formatDate } from "@/utils/date-util";
import { toast } from "@/hooks/use-toast";
import { ScheduleGenerateResult } from "@/applications/schedule-generator/schedule-generate.service";

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
        rate: number;
      }[];
    }[];
  }[];
}) {
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [selectedWbsId, setSelectedWbsId] = useState<string>("");
  const [schedule, setSchedule] = useState<
    ScheduleGenerateResult["schedule"] | null
  >(null);
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const selectedProject = projects.find((p) => p.id === selectedProjectId);
  const selectedWbs = selectedProject?.wbs.find(
    (wbs) => wbs.id === Number(selectedWbsId)
  );

  const [operationPossible, setOperationPossible] = useState<
    {
      assigneeId: string;
      operationPossible: { [date: string]: number };
    }[]
  >([]);

  useEffect(() => {
    if (!selectedWbs) return;

    const fetchOperationPossible = async () => {
      const operationPossible = await getOperationPossible(selectedWbs.id);
      setOperationPossible(operationPossible);
    };

    fetchOperationPossible();
  }, [selectedWbs]);

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
        const { success, error, schedule } = await generateSchedule(
          csv,
          Number(selectedWbsId)
        );

        if (success) {
          setSchedule(schedule);
          toast({
            title: "スケジュールの生成に成功しました",
            description: "スケジュールを生成しました",
          });
        } else {
          setSchedule(null);
          toast({
            title: "スケジュールの生成に失敗しました",
            description: error,
            variant: "destructive",
          });
        }
      } catch (error) {
        console.error("CSV処理エラー:", error);
        setSchedule(null);
        toast({
          title: "スケジュールの生成に失敗しました",
          description: "スケジュールの生成に失敗しました",
          variant: "destructive",
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

  // スケジュールをTSV形式でクリップボードにコピー
  const handleCopyToClipboard = async () => {
    if (!schedule) return;

    const taskSummaries = schedule.map((task) => ({
      taskName: task.taskName,
      assigneeId: task.userId,
      startDate: task.startDate,
      endDate: task.endDate,
      totalHours: task.totalHours,
    }));

    const dataRows = taskSummaries.map((task) => [
      task.taskName,
      task.assigneeId,
      task.startDate,
      task.endDate,
      `${task.totalHours}`,
    ]);

    // TSVヘッダー
    const headers = ["タスク", "担当者", "開始日", "終了日", "工数"];

    // TSV形式に変換（タブ区切り）
    const tsvContent = [
      headers.join("\t"),
      ...dataRows.map((row) => row.join("\t")),
    ].join("\n");

    try {
      // document.execCommand('copy')は非推奨だが、HTTP環境ではnavigator.clipboard APIが利用できないため使用
      const textarea = document.createElement('textarea');
      textarea.value = tsvContent;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
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
    if (!schedule) return null;

    if (!schedule || schedule.length === 0) {
      return (
        <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded">
          <p className="text-yellow-700">スケジュールデータがありません</p>
        </div>
      );
    }

    return (
      <div className="mt-8">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">生成されたスケジュール</h3>
          <Button
            onClick={handleCopyToClipboard}
            disabled={!schedule}
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
              {schedule.map((item, index) => (
                <tr key={`${index}`} className="hover:bg-gray-50">
                  <td className="border border-gray-300 px-4 py-2">
                    {item.taskName}
                  </td>
                  <td className="border border-gray-300 px-4 py-2">
                    {item.userId}
                  </td>
                  <td className="border border-gray-300 px-4 py-2">
                    {item.startDate}
                  </td>
                  <td className="border border-gray-300 px-4 py-2">
                    {item.endDate}
                  </td>
                  <td className="border border-gray-300 px-4 py-2 text-right">
                    {item.totalHours}h
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
                  {formatDate(selectedProject.startDate, "YYYY/MM/DD")}
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-medium text-gray-600">
                  終了日
                </span>
                <span className="text-base">
                  {formatDate(selectedProject.endDate, "YYYY/MM/DD")}
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
                  <div className="flex flex-col">
                    {selectedWbs.assignees.map((assignee) => (
                      <span key={assignee.userId} className="text-base">
                        {assignee.name} ({assignee.rate * 100}%)
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* 担当者ごとの稼働可能時間を表示 */}
      {selectedWbs && operationPossible.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="text-lg font-semibold mb-3 text-blue-800">
            担当者ごとの稼働可能時間
          </h3>
          <div className="overflow-x-auto">
            <table className="min-w-full border border-gray-300">
              <thead className="bg-gray-50">
                <tr>
                  <th className="border border-gray-300 px-4 py-2 text-left">
                    担当者
                  </th>
                  {Object.keys(
                    operationPossible[0]?.operationPossible || {}
                  ).map((date) => (
                    <th
                      key={date}
                      className="border border-gray-300 px-4 py-2 text-center"
                    >
                      {formatDate(new Date(date), "YYYY/MM/DD")}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {operationPossible.map(
                  ({ assigneeId, operationPossible: possible }) => {
                    const assignee = selectedWbs?.assignees.find(
                      (a) => a.userId === assigneeId
                    );
                    return (
                      <tr key={assigneeId}>
                        <td className="border border-gray-300 px-4 py-2">
                          {assignee?.name || assigneeId}
                        </td>
                        {Object.entries(possible).map(([date, hours]) => (
                          <td
                            key={date}
                            className="border border-gray-300 px-4 py-2 text-center"
                          >
                            {hours}
                          </td>
                        ))}
                      </tr>
                    );
                  }
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 生成されたスケジュール */}
      {renderScheduleTable()}
    </div>
  );
}
