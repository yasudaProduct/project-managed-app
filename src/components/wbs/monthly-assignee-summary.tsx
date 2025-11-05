"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Calendar, Users, Download, Info } from "lucide-react";
import React from "react";
import {
  MonthlyAssigneeSummary as MonthlyAssigneeSummaryData,
  TaskAllocationDetail,
} from "@/applications/wbs/query/wbs-summary-result";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  exportMonthlyAssigneeSummary,
  copyMonthlyAssigneeSummaryToClipboard,
} from "@/utils/export-table";
import {
  HoursUnit,
  convertHours,
  getUnitSuffix,
} from "@/utils/hours-converter";
import { Copy } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Settings } from "lucide-react";

interface MonthlyAssigneeSummaryProps {
  monthlyData: MonthlyAssigneeSummaryData;
  hoursUnit: HoursUnit;
  showDifference?: boolean;
  showBaseline?: boolean;
  showForecast?: boolean;
  onShowDifferenceChange?: (value: boolean) => void;
  onShowBaselineChange?: (value: boolean) => void;
  onShowForecastChange?: (value: boolean) => void;
}

export function MonthlyAssigneeSummary({
  monthlyData,
  hoursUnit,
  showDifference = true,
  showBaseline = false,
  showForecast = false,
  onShowDifferenceChange,
  onShowBaselineChange,
  onShowForecastChange,
}: MonthlyAssigneeSummaryProps) {
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [selectedAssignee, setSelectedAssignee] = useState<string | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"monthly" | "task">("monthly");
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const formatNumber = (num: number) => {
    const converted = convertHours(num, hoursUnit);
    return converted.toLocaleString("ja-JP", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const getDifferenceColor = (difference: number) => {
    if (difference > 0) return "text-red-600";
    if (difference === 0) return "text-green-600";
    return "text-blue-600";
  };

  const handleRowClick = (assignee: string) => {
    setSelectedAssignee(assignee);
    setSelectedMonth(monthlyData.months[0]); // 最初の月をデフォルトで選択
    setIsSheetOpen(true);
  };

  if (monthlyData.months.length === 0 || monthlyData.assignees.length === 0) {
    return (
      <Card className="rounded-none shadow-none">
        <CardHeader>
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Calendar className="h-5 w-5 text-blue-600" />
            <Users className="h-5 w-5 text-blue-600" />
            月別・担当者別集計表
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center text-gray-500 py-8">
          集計可能なデータがありません
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="rounded-none shadow-none">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <Calendar className="h-5 w-5 text-blue-600" />
              <Users className="h-5 w-5 text-blue-600" />
              月別・担当者別集計表
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-4 w-4 text-gray-500 cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-sm bg-gray-900 text-white">
                    <div className="space-y-2">
                      <p className="font-semibold">
                        月跨ぎタスクの案分ロジック
                      </p>
                      <ul className="text-xs space-y-1">
                        <li>
                          •
                          タスクが複数月にまたがる場合、各月の日数で按分計算されます
                        </li>
                        <li>• 例：4月20日〜5月10日のタスク（21日間）の場合</li>
                        <li className="ml-4">
                          - 4月分：11日間（4月20日〜4月30日）
                        </li>
                        <li className="ml-4">
                          - 5月分：10日間（5月1日〜5月10日）
                        </li>
                        <li>• 工数は日数の比率で自動的に配分されます</li>
                      </ul>
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </CardTitle>
            <div className="flex gap-2">
              <DropdownMenu open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2">
                    <Settings className="h-4 w-4" />
                    表示設定
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <div className="p-2 space-y-2">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="show-difference"
                        checked={showDifference}
                        onCheckedChange={(checked) =>
                          onShowDifferenceChange?.(!!checked)
                        }
                      />
                      <label
                        htmlFor="show-difference"
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                      >
                        月毎の差分を表示
                      </label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="show-baseline"
                        checked={showBaseline}
                        onCheckedChange={(checked) =>
                          onShowBaselineChange?.(!!checked)
                        }
                      />
                      <label
                        htmlFor="show-baseline"
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                      >
                        月毎の基準を表示
                      </label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="show-forecast"
                        checked={showForecast}
                        onCheckedChange={(checked) =>
                          onShowForecastChange?.(!!checked)
                        }
                      />
                      <label
                        htmlFor="show-forecast"
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                      >
                        月毎の見通しを表示
                      </label>
                    </div>
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={async () => {
                  try {
                    await copyMonthlyAssigneeSummaryToClipboard(
                      monthlyData,
                      hoursUnit
                    );
                    toast({
                      description: "TSV形式でクリップボードにコピーしました",
                    });
                  } catch (error) {
                    toast({
                      description:
                        "コピーに失敗しました" +
                        (error instanceof Error ? error.message : ""),
                      variant: "destructive",
                    });
                  }
                }}
              >
                <Copy className="h-4 w-4" />
                コピー
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2">
                    <Download className="h-4 w-4" />
                    出力
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={() =>
                      exportMonthlyAssigneeSummary(
                        monthlyData,
                        "csv",
                        hoursUnit
                      )
                    }
                  >
                    CSV形式で出力
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() =>
                      exportMonthlyAssigneeSummary(
                        monthlyData,
                        "tsv",
                        hoursUnit
                      )
                    }
                  >
                    TSV形式で出力
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-1">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead className="font-semibold sticky left-0 bg-gray-50 z-10">
                    担当者
                  </TableHead>
                  {monthlyData.months.map((month) => {
                    const colCount = 2 +
                      (showDifference ? 1 : 0) +
                      (showBaseline ? 1 : 0) +
                      (showForecast ? 1 : 0);
                    return (
                      <TableHead
                        key={month}
                        className="text-center font-semibold min-w-[120px]"
                        colSpan={colCount}
                      >
                        {month}
                      </TableHead>
                    );
                  })}
                  <TableHead
                    className="text-center font-semibold min-w-[120px]"
                    colSpan={3}
                  >
                    合計
                  </TableHead>
                </TableRow>
                <TableRow className="bg-gray-50">
                  <TableHead className="sticky left-0 bg-gray-50 z-10"></TableHead>
                  {monthlyData.months.map((period) => (
                    <React.Fragment key={period}>
                      <TableHead className="text-right text-xs">
                        予定({getUnitSuffix(hoursUnit)})
                      </TableHead>
                      <TableHead className="text-right text-xs">
                        実績({getUnitSuffix(hoursUnit)})
                      </TableHead>
                      {showDifference && (
                        <TableHead className="text-right text-xs">差分</TableHead>
                      )}
                      {showBaseline && (
                        <TableHead className="text-right text-xs">
                          基準({getUnitSuffix(hoursUnit)})
                        </TableHead>
                      )}
                      {showForecast && (
                        <TableHead className="text-right text-xs">
                          見通し({getUnitSuffix(hoursUnit)})
                        </TableHead>
                      )}
                    </React.Fragment>
                  ))}
                  {/* 合計列のヘッダー */}
                  <React.Fragment key="合計">
                    <TableHead className="text-right text-xs">
                      予定({getUnitSuffix(hoursUnit)})
                    </TableHead>
                    <TableHead className="text-right text-xs">
                      実績({getUnitSuffix(hoursUnit)})
                    </TableHead>
                    <TableHead className="text-right text-xs">差分</TableHead>
                  </React.Fragment>
                </TableRow>
              </TableHeader>
              <TableBody>
                {monthlyData.assignees.map((assignee) => (
                  <TableRow key={assignee}>
                    <TableCell className="font-medium sticky left-0 bg-white z-10">
                      <button
                        className="w-full text-left px-2 py-1 hover:bg-gray-100 rounded transition-colors cursor-pointer"
                        onClick={() => handleRowClick(assignee)}
                      >
                        {assignee}
                      </button>
                    </TableCell>
                    {monthlyData.months.map((month) => {
                      const data = monthlyData.data.find(
                        (d) => d.month === month && d.assignee === assignee
                      );
                      const plannedHours = data?.plannedHours || 0;
                      const actualHours = data?.actualHours || 0;
                      const difference = data?.difference || 0;
                      const baselineHours = data?.baselineHours || 0;
                      const forecastHours = data?.forecastHours || (actualHours > 0 ? actualHours : plannedHours);

                      return (
                        <React.Fragment key={month}>
                          <TableCell className="text-right text-sm">
                            {plannedHours > 0
                              ? formatNumber(plannedHours)
                              : "-"}
                          </TableCell>
                          <TableCell className="text-right text-sm">
                            {actualHours > 0 ? formatNumber(actualHours) : "-"}
                          </TableCell>
                          {showDifference && (
                            <TableCell
                              className={`text-right text-sm ${getDifferenceColor(
                                difference
                              )}`}
                            >
                              {plannedHours > 0 || actualHours > 0
                                ? formatNumber(difference)
                                : "-"}
                            </TableCell>
                          )}
                          {showBaseline && (
                            <TableCell className="text-right text-sm">
                              {baselineHours > 0
                                ? formatNumber(baselineHours)
                                : "-"}
                            </TableCell>
                          )}
                          {showForecast && (
                            <TableCell className="text-right text-sm">
                              {forecastHours > 0
                                ? formatNumber(forecastHours)
                                : "-"}
                            </TableCell>
                          )}
                        </React.Fragment>
                      );
                    })}
                    {/* 担当者合計 */}
                    <TableCell className="text-right text-sm font-semibold bg-gray-50">
                      {formatNumber(
                        monthlyData.assigneeTotals[assignee].plannedHours
                      )}
                    </TableCell>
                    <TableCell className="text-right text-sm font-semibold bg-gray-50">
                      {formatNumber(
                        monthlyData.assigneeTotals[assignee].actualHours
                      )}
                    </TableCell>
                    <TableCell
                      className={`text-right text-sm font-semibold bg-gray-50 ${getDifferenceColor(
                        monthlyData.assigneeTotals[assignee].difference
                      )}`}
                    >
                      {formatNumber(
                        monthlyData.assigneeTotals[assignee].difference
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {/* 月別合計行 */}
                <TableRow className="bg-gray-100 font-semibold">
                  <TableCell className="sticky left-0 bg-gray-100 z-10">
                    合計
                  </TableCell>
                  {monthlyData.months.map((month) => {
                    const total = monthlyData.monthlyTotals[month];
                    const difference = total.difference;
                    const baselineTotal = total.baselineHours || 0;
                    const forecastTotal = total.forecastHours || (total.actualHours > 0 ? total.actualHours : total.plannedHours);
                    return (
                      <React.Fragment key={month}>
                        <TableCell className="text-right text-sm">
                          {formatNumber(total.plannedHours)}
                        </TableCell>
                        <TableCell className="text-right text-sm">
                          {formatNumber(total.actualHours)}
                        </TableCell>
                        {showDifference && (
                          <TableCell
                            className={`text-right text-sm ${getDifferenceColor(
                              difference
                            )}`}
                          >
                            {formatNumber(difference)}
                          </TableCell>
                        )}
                        {showBaseline && (
                          <TableCell className="text-right text-sm">
                            {baselineTotal > 0 ? formatNumber(baselineTotal) : "-"}
                          </TableCell>
                        )}
                        {showForecast && (
                          <TableCell className="text-right text-sm">
                            {formatNumber(forecastTotal)}
                          </TableCell>
                        )}
                      </React.Fragment>
                    );
                  })}
                  {/* 全体合計 */}
                  <TableCell className="text-right text-sm bg-gray-200">
                    {formatNumber(monthlyData.grandTotal.plannedHours)}
                  </TableCell>
                  <TableCell className="text-right text-sm bg-gray-200">
                    {formatNumber(monthlyData.grandTotal.actualHours)}
                  </TableCell>
                  <TableCell
                    className={`text-right text-sm bg-gray-200 ${getDifferenceColor(
                      monthlyData.grandTotal.difference
                    )}`}
                  >
                    {formatNumber(monthlyData.grandTotal.difference)}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent className="w-[600px] sm:w-[700px] overflow-y-auto">
          {selectedAssignee && (
            <>
              <SheetHeader>
                <SheetTitle>{selectedAssignee} - タスク案分詳細</SheetTitle>
                <SheetDescription>
                  月跨ぎタスクの案分計算詳細を月別に確認できます
                </SheetDescription>
              </SheetHeader>

              <div className="mt-6">
                <div className="bg-gray-50 p-4 rounded-lg mb-6">
                  <h3 className="font-semibold text-sm mb-3">
                    案分ロジックの説明
                  </h3>
                  <ul className="text-xs space-y-1 text-gray-600">
                    <li>
                      •
                      タスクが複数月にまたがる場合、各月の稼働日数で按分計算されます
                    </li>
                    <li>
                      •
                      稼働日は会社の営業日と個人のスケジュールを考慮して算出されます
                    </li>
                    <li>
                      • 工数は各月の利用可能時間の比率で自動的に配分されます
                    </li>
                  </ul>
                </div>

                <Tabs
                  value={viewMode}
                  onValueChange={(value) =>
                    setViewMode(value as "monthly" | "task")
                  }
                >
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="monthly">月別表示</TabsTrigger>
                    <TabsTrigger value="task">タスク別表示</TabsTrigger>
                  </TabsList>

                  <TabsContent value="monthly" className="mt-4">
                    <Tabs
                      value={selectedMonth || monthlyData.months[0]}
                      onValueChange={setSelectedMonth}
                    >
                      <TabsList
                        className="grid w-full"
                        style={{
                          gridTemplateColumns: `repeat(${monthlyData.months.length}, 1fr)`,
                        }}
                      >
                        {monthlyData.months.map((month) => (
                          <TabsTrigger key={month} value={month}>
                            {month}
                          </TabsTrigger>
                        ))}
                      </TabsList>

                      {monthlyData.months.map((month) => {
                        const monthData = monthlyData.data.find(
                          (d) =>
                            d.month === month && d.assignee === selectedAssignee
                        );

                        return (
                          <TabsContent
                            key={month}
                            value={month}
                            className="mt-4"
                          >
                            <div className="space-y-4">
                              <div className="bg-gray-50 p-4 rounded-lg">
                                <h4 className="font-semibold text-sm mb-2">
                                  {month} サマリー
                                </h4>
                                <div className="grid grid-cols-3 gap-4 text-sm">
                                  <div>
                                    <span className="text-gray-500">
                                      予定工数:
                                    </span>
                                    <p className="font-medium">
                                      {monthData
                                        ? formatNumber(monthData.plannedHours)
                                        : "0"}{" "}
                                      {getUnitSuffix(hoursUnit)}
                                    </p>
                                  </div>
                                  <div>
                                    <span className="text-gray-500">
                                      実績工数:
                                    </span>
                                    <p className="font-medium">
                                      {monthData
                                        ? formatNumber(monthData.actualHours)
                                        : "0"}{" "}
                                      {getUnitSuffix(hoursUnit)}
                                    </p>
                                  </div>
                                  <div>
                                    <span className="text-gray-500">差分:</span>
                                    <p
                                      className={`font-medium ${
                                        monthData
                                          ? getDifferenceColor(
                                              monthData.difference
                                            )
                                          : ""
                                      }`}
                                    >
                                      {monthData
                                        ? formatNumber(monthData.difference)
                                        : "0"}{" "}
                                      {getUnitSuffix(hoursUnit)}
                                    </p>
                                  </div>
                                </div>
                              </div>

                              {monthData?.taskDetails &&
                              monthData.taskDetails.length > 0 ? (
                                <div className="space-y-3">
                                  <h4 className="font-semibold">タスク詳細</h4>
                                  {monthData.taskDetails.map((task, idx) => {
                                    const monthAllocation =
                                      task.monthlyAllocations.find(
                                        (ma) => ma.month === month
                                      );

                                    if (
                                      !monthAllocation ||
                                      (monthAllocation.allocatedPlannedHours ===
                                        0 &&
                                        monthAllocation.allocatedActualHours ===
                                          0)
                                    ) {
                                      return null;
                                    }

                                    return (
                                      <div
                                        key={idx}
                                        className="border rounded-lg p-4 space-y-3"
                                      >
                                        <div>
                                          <h5 className="font-medium text-sm">
                                            {task.taskName}
                                          </h5>
                                          <p className="text-xs text-gray-500 mt-1">
                                            期間: {task.startDate} ～{" "}
                                            {task.endDate}
                                          </p>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                          <div className="space-y-2">
                                            <div>
                                              <span className="text-xs text-gray-500">
                                                予定工数:
                                              </span>
                                              <p className="text-sm font-medium">
                                                総計:{" "}
                                                {formatNumber(
                                                  task.totalPlannedHours
                                                )}{" "}
                                                {getUnitSuffix(hoursUnit)}
                                              </p>
                                              <p className="text-sm text-blue-600">
                                                {month}分:{" "}
                                                {formatNumber(
                                                  monthAllocation.allocatedPlannedHours
                                                )}{" "}
                                                {getUnitSuffix(hoursUnit)}
                                                <span className="text-xs text-gray-500 ml-1">
                                                  (
                                                  {(
                                                    monthAllocation.allocationRatio *
                                                    100
                                                  ).toFixed(1)}
                                                  %)
                                                </span>
                                              </p>
                                            </div>
                                          </div>

                                          <div className="space-y-2">
                                            <div>
                                              <span className="text-xs text-gray-500">
                                                実績工数:
                                              </span>
                                              <p className="text-sm font-medium">
                                                総計:{" "}
                                                {formatNumber(
                                                  task.totalActualHours
                                                )}{" "}
                                                {getUnitSuffix(hoursUnit)}
                                              </p>
                                              <p className="text-sm text-blue-600">
                                                {month}分:{" "}
                                                {formatNumber(
                                                  monthAllocation.allocatedActualHours
                                                )}{" "}
                                                {getUnitSuffix(hoursUnit)}
                                              </p>
                                            </div>
                                          </div>
                                        </div>

                                        <div className="bg-gray-50 p-3 rounded text-xs space-y-1">
                                          <p>
                                            <span className="text-gray-500">
                                              稼働日数:
                                            </span>{" "}
                                            {monthAllocation.workingDays}日
                                          </p>
                                          <p>
                                            <span className="text-gray-500">
                                              利用可能時間:
                                            </span>{" "}
                                            {monthAllocation.availableHours.toFixed(
                                              1
                                            )}
                                            時間
                                          </p>
                                          <p>
                                            <span className="text-gray-500">
                                              配分比率:
                                            </span>{" "}
                                            {(
                                              monthAllocation.allocationRatio *
                                              100
                                            ).toFixed(1)}
                                            %
                                          </p>
                                        </div>

                                        {task.monthlyAllocations.length > 1 && (
                                          <div className="border-t pt-3">
                                            <p className="text-xs text-gray-500 mb-2">
                                              全期間の配分:
                                            </p>
                                            <div className="grid grid-cols-2 gap-2 text-xs">
                                              {task.monthlyAllocations.map(
                                                (ma, i) => (
                                                  <div
                                                    key={i}
                                                    className="flex justify-between"
                                                  >
                                                    <span
                                                      className={
                                                        ma.month === month
                                                          ? "font-medium"
                                                          : ""
                                                      }
                                                    >
                                                      {ma.month}
                                                    </span>
                                                    <span
                                                      className={
                                                        ma.month === month
                                                          ? "font-medium text-blue-600"
                                                          : "text-gray-500"
                                                      }
                                                    >
                                                      {formatNumber(
                                                        ma.allocatedPlannedHours
                                                      )}{" "}
                                                      /{" "}
                                                      {formatNumber(
                                                        ma.allocatedActualHours
                                                      )}{" "}
                                                      {getUnitSuffix(hoursUnit)}
                                                    </span>
                                                  </div>
                                                )
                                              )}
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              ) : (
                                <div className="text-center text-gray-500 py-8">
                                  この月にはタスクがありません
                                </div>
                              )}
                            </div>
                          </TabsContent>
                        );
                      })}
                    </Tabs>
                  </TabsContent>

                  <TabsContent value="task" className="mt-4">
                    <div className="space-y-4">
                      {(() => {
                        // 担当者の全タスクを収集
                        const allTasks = new Map<
                          string,
                          TaskAllocationDetail
                        >();

                        monthlyData.data
                          .filter(
                            (d) =>
                              d.assignee === selectedAssignee && d.taskDetails
                          )
                          .forEach((d) => {
                            d.taskDetails?.forEach((task) => {
                              if (!allTasks.has(task.taskId)) {
                                allTasks.set(task.taskId, task);
                              }
                            });
                          });

                        const uniqueTasks = Array.from(allTasks.values());

                        if (uniqueTasks.length === 0) {
                          return (
                            <div className="text-center text-gray-500 py-8">
                              タスクがありません
                            </div>
                          );
                        }

                        return uniqueTasks.map((task, idx) => (
                          <div
                            key={idx}
                            className="border rounded-lg p-4 space-y-3"
                          >
                            <div>
                              <h4 className="font-medium text-sm">
                                {task.taskName}
                              </h4>
                              <p className="text-xs text-gray-500 mt-1">
                                期間: {task.startDate} ～ {task.endDate}
                              </p>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <span className="text-xs text-gray-500">
                                  総予定工数:
                                </span>
                                <p className="text-sm font-medium">
                                  {formatNumber(task.totalPlannedHours)}{" "}
                                  {getUnitSuffix(hoursUnit)}
                                </p>
                              </div>
                              <div>
                                <span className="text-xs text-gray-500">
                                  総実績工数:
                                </span>
                                <p className="text-sm font-medium">
                                  {formatNumber(task.totalActualHours)}{" "}
                                  {getUnitSuffix(hoursUnit)}
                                </p>
                              </div>
                            </div>

                            {task.monthlyAllocations.length > 1 ? (
                              <div className="space-y-3">
                                <h5 className="text-xs font-semibold">
                                  月別配分詳細
                                </h5>
                                <div className="space-y-2">
                                  {task.monthlyAllocations.map((ma, i) => (
                                    <div
                                      key={i}
                                      className="bg-gray-50 p-3 rounded"
                                    >
                                      <div className="flex items-center justify-between mb-2">
                                        <span className="font-medium text-sm">
                                          {ma.month}
                                        </span>
                                        <span className="text-xs text-gray-500">
                                          配分比率:{" "}
                                          {(ma.allocationRatio * 100).toFixed(
                                            1
                                          )}
                                          %
                                        </span>
                                      </div>
                                      <div className="grid grid-cols-2 gap-3 text-xs">
                                        <div>
                                          <span className="text-gray-500">
                                            予定:
                                          </span>
                                          <p className="font-medium">
                                            {formatNumber(
                                              ma.allocatedPlannedHours
                                            )}{" "}
                                            {getUnitSuffix(hoursUnit)}
                                          </p>
                                        </div>
                                        <div>
                                          <span className="text-gray-500">
                                            実績:
                                          </span>
                                          <p className="font-medium">
                                            {formatNumber(
                                              ma.allocatedActualHours
                                            )}{" "}
                                            {getUnitSuffix(hoursUnit)}
                                          </p>
                                        </div>
                                      </div>
                                      <div className="grid grid-cols-2 gap-3 text-xs mt-2">
                                        <div>
                                          <span className="text-gray-500">
                                            稼働日数:
                                          </span>{" "}
                                          {ma.workingDays}日
                                        </div>
                                        <div>
                                          <span className="text-gray-500">
                                            利用可能時間:
                                          </span>{" "}
                                          {ma.availableHours.toFixed(1)}h
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ) : (
                              <div className="bg-gray-50 p-3 rounded text-xs">
                                <p>単月タスク（案分なし）</p>
                                <p className="text-gray-500 mt-1">
                                  月: {task.monthlyAllocations[0]?.month}
                                </p>
                              </div>
                            )}
                          </div>
                        ));
                      })()}
                    </div>
                  </TabsContent>
                </Tabs>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}
