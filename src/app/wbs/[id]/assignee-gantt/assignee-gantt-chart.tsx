"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Calendar,
  Users,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
} from "lucide-react";
import { GanttHeader } from "@/components/assignee-gantt/gantt-header";
import { GanttRow } from "@/components/assignee-gantt/gantt-row";
import { getAssigneeWorkloads } from "@/app/actions/assignee-gantt-actions";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

interface AssigneeGanttChartProps {
  wbsId: number;
}

type ViewMode = "week" | "month";

/**
 * タスク配分
 */
interface TaskAllocation {
  taskId: string;
  taskName: string;
  allocatedHours: number; // 配分された工数
  totalHours: number; // 予定工数
  periodStart?: string;
  periodEnd?: string;
}

/**
 * 一日の作業負荷
 */
interface DailyWorkAllocation {
  date: Date;
  availableHours: number; // 稼働可能時間
  taskAllocations: TaskAllocation[];
  allocatedHours: number; // 配分された工数
  isOverloaded: boolean; // 過負荷かどうか
  utilizationRate: number; // 稼働率
  overloadedHours: number; // 過負荷時間
  isWeekend: boolean; // 土日かどうか
  isCompanyHoliday: boolean; // 会社休日かどうか
  userSchedules: {
    // 個人予定
    title: string; // タイトル
    startTime: string; // 開始時間
    endTime: string; // 終了時間
    durationHours: number; // 期間
  }[];
  isOverloadedByStandard: boolean; // 標準超過かどうか
  overloadedByStandardHours: number; // 標準超過時間
  rateAllowedHours: number; // レート基準の許容工数
  isOverRateCapacity: boolean; // レート基準超過かどうか
  overRateHours: number; // レート基準超過時間
}

/**
 * 担当者の作業負荷
 */
interface AssigneeWorkload {
  assigneeId: string;
  assigneeName: string;
  dailyAllocations: DailyWorkAllocation[]; // 一日の作業負荷
  overloadedDays: DailyWorkAllocation[]; // 過負荷日
  assigneeRate: number;
}

/**
 * 担当者別ガントチャート
 * @returns
 */
export function AssigneeGanttChart({ wbsId }: AssigneeGanttChartProps) {
  const [workloads, setWorkloads] = useState<AssigneeWorkload[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 警告（実現不可能タスク）
  const [warnings, setWarnings] = useState<
    {
      taskId: number;
      taskNo: string;
      taskName: string;
      assigneeId?: string;
      assigneeName?: string;
      periodStart?: string;
      periodEnd?: string;
      reason: "NO_WORKING_DAYS";
    }[]
  >([]);
  const [viewMode, setViewMode] = useState<ViewMode>("month");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [selectedAssignee, setSelectedAssignee] =
    useState<AssigneeWorkload | null>(null);
  const [selectedAllocation, setSelectedAllocation] =
    useState<DailyWorkAllocation | null>(null);

  // 日付範囲を計算
  const getDateRange = (mode: ViewMode, baseDate: Date): Date[] => {
    const dates: Date[] = [];
    let startDate: Date;
    let endDate: Date;

    switch (mode) {
      case "week":
        // 週の始まり（月曜日）を取得
        startDate = new Date(baseDate);
        const dayOfWeek = startDate.getDay();
        const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
        startDate.setDate(startDate.getDate() + mondayOffset);

        endDate = new Date(startDate);
        endDate.setDate(startDate.getDate() + 6);
        break;

      case "month":
        startDate = new Date(baseDate.getFullYear(), baseDate.getMonth(), 1);
        endDate = new Date(baseDate.getFullYear(), baseDate.getMonth() + 1, 0);
        break;
    }

    for (
      let date = new Date(startDate);
      date <= endDate;
      date.setDate(date.getDate() + 1)
    ) {
      dates.push(new Date(date));
    }

    return dates;
  };

  // 日付範囲
  const dateRange = getDateRange(viewMode, currentDate);

  // 警告（実現不可能タスク）の期間を担当者別・日付セットに展開
  const warningDateMap: Record<string, Set<string>> = useMemo(() => {
    const map: Record<string, Set<string>> = {};
    if (!warnings || warnings.length === 0 || dateRange.length === 0)
      return map;

    const toLocalYMD = (d: Date) => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      return `${y}-${m}-${day}`;
    };

    for (const w of warnings) {
      if (!w.assigneeId || !w.periodStart || !w.periodEnd) continue;
      const start = new Date(w.periodStart);
      const end = new Date(w.periodEnd);
      const startYmd = toLocalYMD(start);
      const endYmd = toLocalYMD(end);

      for (const date of dateRange) {
        const ymd = toLocalYMD(date);
        if (ymd >= startYmd && ymd <= endYmd) {
          if (!map[w.assigneeId]) map[w.assigneeId] = new Set<string>();
          map[w.assigneeId].add(ymd);
        }
      }
    }

    return map;
  }, [warnings, dateRange]);

  // データ取得用のServer Action呼び出し
  const fetchWorkloads = useCallback(async () => {
    const currentDateRange = getDateRange(viewMode, currentDate);
    if (!currentDateRange.length) return;

    setLoading(true);
    setError(null);

    try {
      const startDate = currentDateRange[0];
      const endDate = currentDateRange[currentDateRange.length - 1];

      // YYYY-MM-DD に正規化して送信（サーバ側でUTC深夜に変換）
      const toYMD = (d: Date) => d.toISOString().split("T")[0];

      const result = await getAssigneeWorkloads(
        wbsId,
        toYMD(startDate),
        toYMD(endDate)
      );

      if (!result.success || !result.data) {
        throw new Error(result.error || "作業負荷の取得に失敗しました");
      }

      const data = result.data;
      const warn = result.warnings || [];

      // サーバー計算済み値を利用しつつ、日付だけDateに変換
      const workloadObjects: AssigneeWorkload[] = data.map((workloadData) => {
        const dailyAllocations: DailyWorkAllocation[] =
          workloadData.dailyAllocations.map((daily) => {
            const taskAllocations: TaskAllocation[] = daily.taskAllocations.map(
              (task) => ({
                taskId: task.taskId,
                taskName: task.taskName,
                allocatedHours: task.allocatedHours,
                totalHours: task.totalHours,
                periodStart: task.periodStart,
                periodEnd: task.periodEnd,
              })
            );

            return {
              date: new Date(daily.date),
              availableHours: daily.availableHours,
              taskAllocations,
              allocatedHours: daily.allocatedHours,
              isOverloaded: daily.isOverloaded,
              utilizationRate: daily.utilizationRate,
              overloadedHours: daily.overloadedHours,
              isWeekend: !!daily.isWeekend,
              isCompanyHoliday: !!daily.isCompanyHoliday,
              userSchedules: daily.userSchedules || [],
              isOverloadedByStandard: daily.isOverloadedByStandard,
              overloadedByStandardHours: daily.overloadedByStandardHours,
              rateAllowedHours: daily.rateAllowedHours,
              isOverRateCapacity: daily.isOverRateCapacity,
              overRateHours: daily.overRateHours,
            };
          });

        const overloadedDays = dailyAllocations.filter((d) => d.isOverloaded);

        return {
          assigneeId: workloadData.assigneeId,
          assigneeName: workloadData.assigneeName,
          dailyAllocations,
          overloadedDays,
          assigneeRate: workloadData.assigneeRate,
        };
      });

      setWorkloads(workloadObjects);
      setWarnings(warn);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "作業負荷の取得に失敗しました"
      );
      setWorkloads([]);
      setWarnings([]);
    } finally {
      setLoading(false);
    }
  }, [wbsId, viewMode, currentDate]);

  useEffect(() => {
    fetchWorkloads();
  }, [fetchWorkloads]);

  // ナビゲーション
  const navigatePrevious = () => {
    const newDate = new Date(currentDate);
    switch (viewMode) {
      case "week":
        newDate.setDate(newDate.getDate() - 7);
        break;
      case "month":
        newDate.setMonth(newDate.getMonth() - 1);
        break;
      default:
        newDate.setDate(newDate.getDate() - 14);
    }
    setCurrentDate(newDate);
  };

  // ナビゲーション（次）
  const navigateNext = () => {
    const newDate = new Date(currentDate);
    switch (viewMode) {
      case "week":
        newDate.setDate(newDate.getDate() + 7);
        break;
      case "month":
        newDate.setMonth(newDate.getMonth() + 1);
        break;
      default:
        newDate.setDate(newDate.getDate() + 14);
    }
    setCurrentDate(newDate);
  };

  // 今日に戻る
  const goToToday = () => {
    setCurrentDate(new Date());
  };

  // セル クリック処理
  const handleCellClick = (assigneeId: string, date: Date) => {
    const workload = workloads.find((w) => w.assigneeId === assigneeId) || null;
    let allocation: DailyWorkAllocation | null =
      workload?.dailyAllocations.find(
        (d) => d.date.toDateString() === date.toDateString()
      ) || null;

    if (!allocation) {
      const dayOfWeek = date.getDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      allocation = {
        date,
        availableHours: isWeekend ? 0 : 7.5,
        taskAllocations: [],
        allocatedHours: 0,
        isOverloaded: false,
        utilizationRate: 0,
        overloadedHours: 0,
        isWeekend,
        isCompanyHoliday: isWeekend,
        userSchedules: [],
        isOverloadedByStandard: false,
        overloadedByStandardHours: 0,
        rateAllowedHours: 0,
        isOverRateCapacity: false,
        overRateHours: 0,
      };
    }

    setSelectedAssignee(workload);
    setSelectedAllocation(allocation);
    setIsSheetOpen(true);
  };

  // 過負荷状態の担当者数を計算
  const overloadedAssignees = workloads.filter(
    (workload) => workload.overloadedDays.length > 0
  );

  // 表示期間のフォーマット
  const formatPeriod = () => {
    if (!dateRange.length) return "";

    const start = dateRange[0];
    const end = dateRange[dateRange.length - 1];

    if (viewMode === "month") {
      return `${start.getFullYear()}年${start.getMonth() + 1}月`;
    }

    return `${start.toLocaleDateString("ja-JP")} - ${end.toLocaleDateString(
      "ja-JP"
    )}`;
  };

  // 読み込み中
  if (loading) {
    return (
      <Card className="w-full">
        <CardContent className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
            <p className="text-sm text-gray-600">作業負荷を読み込み中...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="w-full">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-600" />
              <Calendar className="h-5 w-5 text-blue-600" />
              担当者別ガントチャート
              {overloadedAssignees.length > 0 && (
                <div className="flex items-center gap-1 ml-2 px-2 py-1 bg-red-100 text-red-800 rounded text-sm">
                  <AlertTriangle className="h-4 w-4" />
                  過負荷: {overloadedAssignees.length}名
                </div>
              )}
            </CardTitle>

            <div className="flex items-center gap-2">
              <Select
                value={viewMode}
                onValueChange={(value: ViewMode) => setViewMode(value)}
              >
                <SelectTrigger className="w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="week">週表示</SelectItem>
                  <SelectItem value="month">月表示</SelectItem>
                </SelectContent>
              </Select>

              <div className="flex items-center gap-1">
                <Button variant="outline" size="sm" onClick={navigatePrevious}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={goToToday}>
                  今日
                </Button>
                <Button variant="outline" size="sm" onClick={navigateNext}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between text-sm text-gray-600">
            <span>期間: {formatPeriod()}</span>
            <span>担当者: {workloads.length}名</span>
          </div>
          {warnings.length > 0 && (
            <div className="mt-2 p-3 rounded border border-yellow-300 bg-yellow-50 text-yellow-800 text-sm">
              <div className="flex items-center gap-2 mb-1">
                <AlertTriangle className="h-4 w-4" />
                <span>
                  実現不可能なタスクが見つかりました（すべて非稼働日）
                </span>
              </div>
              <ul className="list-disc pl-6 space-y-1">
                {warnings.slice(0, 5).map((w, i) => (
                  <li key={i} className="truncate">
                    {w.taskNo + " / "}
                    {w.taskName}
                    {w.assigneeName ? ` / ${w.assigneeName}` : ""}
                    {w.periodStart && w.periodEnd
                      ? `（${new Date(w.periodStart).toLocaleDateString(
                          "ja-JP"
                        )} - ${new Date(w.periodEnd).toLocaleDateString(
                          "ja-JP"
                        )}）`
                      : ""}
                  </li>
                ))}
              </ul>
              {warnings.length > 5 && (
                <div className="text-xs text-gray-600 mt-1">
                  他 {warnings.length - 5} 件
                </div>
              )}
            </div>
          )}
        </CardHeader>

        <CardContent className="p-0">
          {error ? (
            <div className="p-8 text-center">
              <div className="text-red-600 mb-2">エラーが発生しました</div>
              <div className="text-sm text-gray-600 mb-4">{error}</div>
              <Button onClick={fetchWorkloads} variant="outline" size="sm">
                再試行
              </Button>
            </div>
          ) : workloads.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              担当者のデータがありません
            </div>
          ) : (
            <div className="overflow-auto max-h-[600px]">
              <div className="min-w-fit">
                <GanttHeader
                  dateRange={dateRange}
                  onDateClick={(date) => console.log("Date clicked:", date)}
                />

                {workloads.map((workload) => (
                  <GanttRow
                    key={workload.assigneeId}
                    assignee={workload}
                    dateRange={dateRange}
                    warningDates={warningDateMap[workload.assigneeId]}
                    onCellClick={handleCellClick}
                  />
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent className="w-[520px] sm:w-[640px] overflow-y-auto">
          {selectedAssignee && selectedAllocation && (
            <>
              <SheetHeader>
                <SheetTitle>
                  {selectedAssignee.assigneeName} -{" "}
                  {selectedAllocation.date.toLocaleDateString("ja-JP")}
                </SheetTitle>
                <SheetDescription>選択した日の作業負荷詳細</SheetDescription>
              </SheetHeader>

              <div className="mt-6 space-y-1">
                <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded">
                  <div className="text-sm">
                    <div className="text-gray-500">予定工数</div>
                    <div className="font-medium">
                      {selectedAllocation.allocatedHours.toFixed(2)}h
                    </div>
                  </div>
                  <div className="text-sm">
                    <div className="text-gray-500">稼働可能時間</div>
                    <div className="font-medium">
                      {selectedAllocation.availableHours.toFixed(2)}h
                    </div>
                  </div>
                  <div className="text-sm">
                    <div className="text-gray-500">稼働率</div>
                    <div
                      className={
                        selectedAllocation.isOverloaded
                          ? "font-medium text-red-600"
                          : "font-medium text-green-600"
                      }
                    >
                      {(selectedAllocation.utilizationRate * 100).toFixed(2)}%
                    </div>
                  </div>
                  <div className="text-sm">
                    <div className="text-gray-500">状態</div>
                    <div
                      className={
                        selectedAllocation.isOverloaded ||
                        selectedAllocation.isOverloadedByStandard
                          ? "font-medium text-red-600"
                          : "font-medium text-gray-700"
                      }
                    >
                      {selectedAllocation.isOverloaded
                        ? `過負荷 (+${selectedAllocation.overloadedHours.toFixed(
                            2
                          )}h)`
                        : "適正"}
                      {selectedAllocation.isOverloadedByStandard &&
                        !selectedAllocation.isOverloaded &&
                        ` / 標準超過 (+${selectedAllocation.overloadedByStandardHours.toFixed(
                          2
                        )}h)`}
                    </div>
                  </div>
                  <div className="text-sm col-span-2">
                    <div className="text-gray-500">
                      レート基準({selectedAssignee.assigneeRate * 100}%)
                    </div>
                    <div
                      className={
                        selectedAllocation.isOverRateCapacity
                          ? "font-medium text-blue-600"
                          : "font-medium text-gray-700"
                      }
                    >
                      許容: {selectedAllocation.rateAllowedHours.toFixed(2)}h /
                      超過: {selectedAllocation.overRateHours.toFixed(2)}h
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="text-sm font-semibold">タスク詳細</div>
                  {selectedAllocation.taskAllocations.length > 0 ? (
                    <div className="space-y-2">
                      {selectedAllocation.taskAllocations.map((t, i) => (
                        <div
                          key={i}
                          className="flex items-center justify-between text-sm border rounded p-2"
                        >
                          <div className="font-medium truncate mr-2">
                            {t.taskName}
                          </div>
                          <div className="text-xs text-gray-600 flex items-center gap-2">
                            <span>
                              {t.totalHours.toFixed(2)}h <br />
                              (内訳:{t.allocatedHours.toFixed(2)}h)
                            </span>
                            {t.periodStart && t.periodEnd && (
                              <span className="text-xs text-gray-500">
                                {new Date(t.periodStart).toLocaleDateString(
                                  "ja-JP"
                                )}{" "}
                                -{" "}
                                {new Date(t.periodEnd).toLocaleDateString(
                                  "ja-JP"
                                )}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-sm text-gray-500">
                      タスクはありません
                    </div>
                  )}
                </div>

                {selectedAllocation.userSchedules &&
                  selectedAllocation.userSchedules.length > 0 && (
                    <div className="space-y-2">
                      <div className="text-sm font-semibold">個人予定</div>
                      <div className="space-y-1 text-xs text-gray-700">
                        {selectedAllocation.userSchedules.map((s, i) => (
                          <div
                            key={i}
                            className="flex items-center justify-between border rounded p-2"
                          >
                            <span className="mr-2">{s.title}</span>
                            <span>
                              {s.startTime} - {s.endTime} (
                              {s.durationHours.toFixed(2)}h)
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}
