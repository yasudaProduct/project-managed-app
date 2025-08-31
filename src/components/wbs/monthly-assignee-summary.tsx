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
import { MonthlyAssigneeSummary as MonthlyAssigneeSummaryData } from "@/applications/wbs/query/wbs-summary-result";
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

interface MonthlyAssigneeSummaryProps {
  monthlyData: MonthlyAssigneeSummaryData;
  hoursUnit: HoursUnit;
}

export function MonthlyAssigneeSummary({
  monthlyData,
  hoursUnit,
}: MonthlyAssigneeSummaryProps) {
  const formatNumber = (num: number) => {
    const converted = convertHours(num, hoursUnit);
    return converted.toLocaleString("ja-JP", {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    });
  };

  const getDifferenceColor = (difference: number) => {
    if (difference > 0) return "text-red-600";
    if (difference === 0) return "text-green-600";
    return "text-blue-600";
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
                    <p className="font-semibold">月跨ぎタスクの案分ロジック</p>
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
                    exportMonthlyAssigneeSummary(monthlyData, "csv", hoursUnit)
                  }
                >
                  CSV形式で出力
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() =>
                    exportMonthlyAssigneeSummary(monthlyData, "tsv", hoursUnit)
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
                {monthlyData.months.map((month) => (
                  <TableHead
                    key={month}
                    className="text-center font-semibold min-w-[120px]"
                    colSpan={3}
                  >
                    {month}
                  </TableHead>
                ))}
                <TableHead
                  className="text-center font-semibold min-w-[120px]"
                  colSpan={3}
                >
                  合計
                </TableHead>
              </TableRow>
              <TableRow className="bg-gray-50">
                <TableHead className="sticky left-0 bg-gray-50 z-10"></TableHead>
                {[...monthlyData.months, "合計"].map((period) => (
                  <React.Fragment key={period}>
                    <TableHead className="text-right text-xs">
                      予定({getUnitSuffix(hoursUnit)})
                    </TableHead>
                    <TableHead className="text-right text-xs">
                      実績({getUnitSuffix(hoursUnit)})
                    </TableHead>
                    <TableHead className="text-right text-xs">差分</TableHead>
                  </React.Fragment>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {monthlyData.assignees.map((assignee) => (
                <TableRow key={assignee}>
                  <TableCell className="font-medium sticky left-0 bg-white z-10">
                    {assignee}
                  </TableCell>
                  {monthlyData.months.map((month) => {
                    const data = monthlyData.data.find(
                      (d) => d.month === month && d.assignee === assignee
                    );
                    const plannedHours = data?.plannedHours || 0;
                    const actualHours = data?.actualHours || 0;
                    const difference = data?.difference || 0;
                    return (
                      <React.Fragment key={month}>
                        <TableCell className="text-right text-sm">
                          {plannedHours > 0 ? (
                            data?.taskDetails && data.taskDetails.length > 0 ? (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <span className="cursor-help underline decoration-dotted">
                                      {formatNumber(plannedHours)}
                                    </span>
                                  </TooltipTrigger>
                                  <TooltipContent className="max-w-lg bg-gray-900 text-white p-4">
                                    <div className="space-y-3">
                                      <p className="font-semibold text-sm">
                                        {data.assignee} - {data.month} 予定工数内訳
                                      </p>
                                      <div className="space-y-2 max-h-96 overflow-y-auto">
                                        {data.taskDetails.map((task, idx) => {
                                          const monthAllocation = task.monthlyAllocations.find(
                                            (ma) => ma.month === data.month
                                          );
                                          if (!monthAllocation || monthAllocation.allocatedPlannedHours === 0) return null;
                                          return (
                                            <div key={idx} className="text-xs border-b border-gray-700 pb-2 last:border-0">
                                              <div className="font-medium">{task.taskName}</div>
                                              <div className="text-gray-300 mt-1">
                                                期間: {task.startDate} ～ {task.endDate}
                                              </div>
                                              <div className="text-gray-300">
                                                総工数: {formatNumber(task.totalPlannedHours)}{getUnitSuffix(hoursUnit)}
                                              </div>
                                              <div className="text-yellow-300 mt-1">
                                                {data.month}分: {formatNumber(monthAllocation.allocatedPlannedHours)}{getUnitSuffix(hoursUnit)}
                                                ({(monthAllocation.allocationRatio * 100).toFixed(1)}%)
                                              </div>
                                              <div className="text-gray-400 text-xs mt-1">
                                                稼働日数: {monthAllocation.workingDays}日 / 
                                                利用可能時間: {monthAllocation.availableHours.toFixed(1)}h
                                              </div>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            ) : (
                              formatNumber(plannedHours)
                            )
                          ) : (
                            "-"
                          )}
                        </TableCell>
                        <TableCell className="text-right text-sm">
                          {actualHours > 0 ? (
                            data?.taskDetails && data.taskDetails.length > 0 ? (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <span className="cursor-help underline decoration-dotted">
                                      {formatNumber(actualHours)}
                                    </span>
                                  </TooltipTrigger>
                                  <TooltipContent className="max-w-lg bg-gray-900 text-white p-4">
                                    <div className="space-y-3">
                                      <p className="font-semibold text-sm">
                                        {data.assignee} - {data.month} 実績工数内訳
                                      </p>
                                      <div className="space-y-2 max-h-96 overflow-y-auto">
                                        {data.taskDetails.map((task, idx) => {
                                          const monthAllocation = task.monthlyAllocations.find(
                                            (ma) => ma.month === data.month
                                          );
                                          if (!monthAllocation || monthAllocation.allocatedActualHours === 0) return null;
                                          return (
                                            <div key={idx} className="text-xs border-b border-gray-700 pb-2 last:border-0">
                                              <div className="font-medium">{task.taskName}</div>
                                              <div className="text-gray-300 mt-1">
                                                期間: {task.startDate} ～ {task.endDate}
                                              </div>
                                              <div className="text-gray-300">
                                                総工数: {formatNumber(task.totalActualHours)}{getUnitSuffix(hoursUnit)}
                                              </div>
                                              <div className="text-yellow-300 mt-1">
                                                {data.month}分: {formatNumber(monthAllocation.allocatedActualHours)}{getUnitSuffix(hoursUnit)}
                                                ({(monthAllocation.allocationRatio * 100).toFixed(1)}%)
                                              </div>
                                              <div className="text-gray-400 text-xs mt-1">
                                                稼働日数: {monthAllocation.workingDays}日 / 
                                                利用可能時間: {monthAllocation.availableHours.toFixed(1)}h
                                              </div>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            ) : (
                              formatNumber(actualHours)
                            )
                          ) : (
                            "-"
                          )}
                        </TableCell>
                        <TableCell
                          className={`text-right text-sm ${getDifferenceColor(
                            difference
                          )}`}
                        >
                          {plannedHours > 0 || actualHours > 0
                            ? formatNumber(difference)
                            : "-"}
                        </TableCell>
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
                  return (
                    <React.Fragment key={month}>
                      <TableCell className="text-right text-sm">
                        {formatNumber(total.plannedHours)}
                      </TableCell>
                      <TableCell className="text-right text-sm">
                        {formatNumber(total.actualHours)}
                      </TableCell>
                      <TableCell
                        className={`text-right text-sm ${getDifferenceColor(
                          difference
                        )}`}
                      >
                        {formatNumber(difference)}
                      </TableCell>
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
  );
}
