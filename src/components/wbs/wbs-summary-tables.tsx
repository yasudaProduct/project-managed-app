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
import { Layers, Users, Download } from "lucide-react";
import { MonthlyAssigneeSummary } from "./monthly-assignee-summary";
import { MonthlyPhaseSummary } from "./monthly-phase-summary";
import { useWbsSummary } from "@/hooks/use-wbs-summary";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  exportPhaseSummary,
  exportAssigneeSummary,
  copyPhaseSummaryToClipboard,
  copyAssigneeSummaryToClipboard,
} from "@/utils/export-table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useState } from "react";
import {
  HoursUnit,
  HOURS_UNIT_LABELS,
  convertHours,
  getUnitSuffix,
} from "@/utils/hours-converter";
import { Copy } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import SummaryDisplaySettings, {
  SummaryDisplaySettingColumn,
} from "@/components/wbs/summary-display-settings";
import {
  SummaryColumnSettings,
  ToggleableSummaryColumn,
  isSummaryColumnToggleDisabled,
  toggleSummaryColumn,
} from "@/utils/summary-column-visibility";

interface WbsSummaryTablesProps {
  projectId: string;
  wbsId: number;
}

export function WbsSummaryTables({ projectId, wbsId }: WbsSummaryTablesProps) {
  const { data: summary, isLoading, error } = useWbsSummary(projectId, wbsId);
  const [hoursUnit, setHoursUnit] = useState<HoursUnit>("hours");

  // 集計表の列の表示切り替え状態
  // 基準・予定・実績・見通しの4列すべてが同時に表示されないよう、初期値は基準を非表示とする
  const [showDifference, setShowDifference] = useState(true);
  const [showBaseline, setShowBaseline] = useState(false);
  const [showPlanned, setShowPlanned] = useState(true);
  const [showForecast, setShowForecast] = useState(true);

  const columnSettings: SummaryColumnSettings = {
    showBaseline,
    showPlanned,
    showForecast,
  };

  // 基準・予定・見通しは同時に2列までしか表示できない
  const changeColumnVisibility = (
    column: ToggleableSummaryColumn,
    next: boolean
  ) => {
    const updated = toggleSummaryColumn(columnSettings, column, next);
    setShowBaseline(updated.showBaseline);
    setShowPlanned(updated.showPlanned);
    setShowForecast(updated.showForecast);
  };

  const isColumnToggleDisabled = (column: SummaryDisplaySettingColumn) =>
    column === "difference"
      ? false
      : isSummaryColumnToggleDisabled(columnSettings, column);

  // 工程別・担当者別集計表のコピー・出力対象の列（表示中の列のみ）
  const categoryExportColumns = {
    showPlanned,
    showActual: true,
    showDifference,
  };

  // 工程別・担当者別集計表の列数（工程/担当者・タスク数・実績 + 表示中の列）
  const categoryColumnCount =
    3 + (showPlanned ? 1 : 0) + (showDifference ? 1 : 0);

  const handleCategoryColumnChange = (
    column: SummaryDisplaySettingColumn,
    next: boolean
  ) => {
    if (column === "difference") {
      setShowDifference(next);
      return;
    }
    changeColumnVisibility(column, next);
  };

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

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="rounded-none shadow-none">
            <CardHeader>
              <Skeleton className="h-6 w-32" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-64 w-full" />
            </CardContent>
          </Card>
          <Card className="rounded-none shadow-none">
            <CardHeader>
              <Skeleton className="h-6 w-32" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-64 w-full" />
            </CardContent>
          </Card>
        </div>
        <Card className="rounded-none shadow-none">
          <CardHeader>
            <Skeleton className="h-6 w-48" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-96 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center text-red-600 py-8">
        集計データの取得に失敗しました <br />
        {error.message}
      </div>
    );
  }

  if (!summary) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* 工数単位選択 */}
      <div className="flex justify-end">
        <Select
          value={hoursUnit}
          onValueChange={(value) => setHoursUnit(value as HoursUnit)}
        >
          <SelectTrigger className="w-32">
            <SelectValue placeholder="単位を選択" />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(HOURS_UNIT_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 工程別集計表 */}
        <Card className="rounded-none shadow-none">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <Layers className="h-5 w-5 text-blue-600" />
                工程別集計表
              </CardTitle>
              <div className="flex gap-2">
                <SummaryDisplaySettings
                  idPrefix="phase-summary"
                  columns={["planned", "difference"]}
                  values={{
                    difference: showDifference,
                    baseline: showBaseline,
                    planned: showPlanned,
                    forecast: showForecast,
                  }}
                  onChange={handleCategoryColumnChange}
                  isDisabled={isColumnToggleDisabled}
                />
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={async () => {
                    try {
                      await copyPhaseSummaryToClipboard(
                        summary.phaseSummaries,
                        summary.phaseTotal,
                        hoursUnit,
                        categoryExportColumns
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
                        exportPhaseSummary(
                          summary.phaseSummaries,
                          summary.phaseTotal,
                          "csv",
                          hoursUnit,
                          categoryExportColumns
                        )
                      }
                    >
                      CSV形式で出力
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() =>
                        exportPhaseSummary(
                          summary.phaseSummaries,
                          summary.phaseTotal,
                          "tsv",
                          hoursUnit,
                          categoryExportColumns
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
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead className="font-semibold">工程</TableHead>
                  <TableHead className="text-center font-semibold">
                    タスク数
                  </TableHead>
                  {showPlanned && (
                    <TableHead className="text-right font-semibold">
                      予定工数({getUnitSuffix(hoursUnit)})
                    </TableHead>
                  )}
                  <TableHead className="text-right font-semibold">
                    実績工数({getUnitSuffix(hoursUnit)})
                  </TableHead>
                  {showDifference && (
                    <TableHead className="text-right font-semibold">
                      差分
                    </TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {summary.phaseSummaries.map((item, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">{item.phase}</TableCell>
                    <TableCell className="text-center">
                      {item.taskCount}
                    </TableCell>
                    {showPlanned && (
                      <TableCell className="text-right">
                        {formatNumber(item.plannedHours)}
                      </TableCell>
                    )}
                    <TableCell className="text-right">
                      {formatNumber(item.actualHours)}
                    </TableCell>
                    {showDifference && (
                      <TableCell
                        className={`text-right ${getDifferenceColor(
                          item.difference
                        )}`}
                      >
                        {formatNumber(item.difference)}
                      </TableCell>
                    )}
                  </TableRow>
                ))}
                <TableRow className="bg-gray-50 font-semibold">
                  <TableCell>合計</TableCell>
                  <TableCell className="text-center">
                    {summary.phaseTotal.taskCount}
                  </TableCell>
                  {showPlanned && (
                    <TableCell className="text-right">
                      {formatNumber(summary.phaseTotal.plannedHours)}
                    </TableCell>
                  )}
                  <TableCell className="text-right">
                    {formatNumber(summary.phaseTotal.actualHours)}
                  </TableCell>
                  {showDifference && (
                    <TableCell
                      className={`text-right ${getDifferenceColor(
                        summary.phaseTotal.difference
                      )}`}
                    >
                      {formatNumber(summary.phaseTotal.difference)}
                    </TableCell>
                  )}
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* 担当者別集計表 */}
        <Card className="rounded-none shadow-none">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <Users className="h-5 w-5 text-blue-600" />
                担当者別集計表
              </CardTitle>
              {summary.assigneeSummaries.length > 0 && (
                <div className="flex gap-2">
                  <SummaryDisplaySettings
                    idPrefix="assignee-summary"
                    columns={["planned", "difference"]}
                    values={{
                      difference: showDifference,
                      baseline: showBaseline,
                      planned: showPlanned,
                      forecast: showForecast,
                    }}
                    onChange={handleCategoryColumnChange}
                    isDisabled={isColumnToggleDisabled}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    onClick={async () => {
                      try {
                        await copyAssigneeSummaryToClipboard(
                          summary.assigneeSummaries,
                          summary.assigneeTotal,
                          hoursUnit,
                          categoryExportColumns
                        );
                        toast({
                          description:
                            "TSV形式でクリップボードにコピーしました",
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
                          exportAssigneeSummary(
                            summary.assigneeSummaries,
                            summary.assigneeTotal,
                            "csv",
                            hoursUnit,
                            categoryExportColumns
                          )
                        }
                      >
                        CSV形式で出力
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() =>
                          exportAssigneeSummary(
                            summary.assigneeSummaries,
                            summary.assigneeTotal,
                            "tsv",
                            hoursUnit,
                            categoryExportColumns
                          )
                        }
                      >
                        TSV形式で出力
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-1">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead className="font-semibold">担当者</TableHead>
                  <TableHead className="text-center font-semibold">
                    タスク数
                  </TableHead>
                  {showPlanned && (
                    <TableHead className="text-right font-semibold">
                      予定工数({getUnitSuffix(hoursUnit)})
                    </TableHead>
                  )}
                  <TableHead className="text-right font-semibold">
                    実績工数({getUnitSuffix(hoursUnit)})
                  </TableHead>
                  {showDifference && (
                    <TableHead className="text-right font-semibold">
                      差分
                    </TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {summary.assigneeSummaries.map((item, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">
                      {item.assignee}
                    </TableCell>
                    <TableCell className="text-center">
                      {item.taskCount}
                    </TableCell>
                    {showPlanned && (
                      <TableCell className="text-right">
                        {formatNumber(item.plannedHours)}
                      </TableCell>
                    )}
                    <TableCell className="text-right">
                      {formatNumber(item.actualHours)}
                    </TableCell>
                    {showDifference && (
                      <TableCell
                        className={`text-right ${getDifferenceColor(
                          item.difference
                        )}`}
                      >
                        {formatNumber(item.difference)}
                      </TableCell>
                    )}
                  </TableRow>
                ))}
                {summary.assigneeSummaries.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={categoryColumnCount}
                      className="text-center text-gray-500 py-4"
                    >
                      担当者が割り当てられたタスクがありません
                    </TableCell>
                  </TableRow>
                )}
                {summary.assigneeSummaries.length > 0 && (
                  <TableRow className="bg-gray-50 font-semibold">
                    <TableCell>合計</TableCell>
                    <TableCell className="text-center">
                      {summary.assigneeTotal.taskCount}
                    </TableCell>
                    {showPlanned && (
                      <TableCell className="text-right">
                        {formatNumber(summary.assigneeTotal.plannedHours)}
                      </TableCell>
                    )}
                    <TableCell className="text-right">
                      {formatNumber(summary.assigneeTotal.actualHours)}
                    </TableCell>
                    {showDifference && (
                      <TableCell
                        className={`text-right ${getDifferenceColor(
                          summary.assigneeTotal.difference
                        )}`}
                      >
                        {formatNumber(summary.assigneeTotal.difference)}
                      </TableCell>
                    )}
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* 月別・担当者別集計表 */}
      <MonthlyAssigneeSummary
        monthlyData={summary.monthlyAssigneeSummary}
        hoursUnit={hoursUnit}
        showDifference={showDifference}
        showBaseline={showBaseline}
        showPlanned={showPlanned}
        showForecast={showForecast}
        onShowDifferenceChange={setShowDifference}
        onShowBaselineChange={(value) =>
          changeColumnVisibility("baseline", value)
        }
        onShowPlannedChange={(value) =>
          changeColumnVisibility("planned", value)
        }
        onShowForecastChange={(value) =>
          changeColumnVisibility("forecast", value)
        }
        isColumnToggleDisabled={isColumnToggleDisabled}
      />

      {/* 月別・工程別集計表 */}
      {summary.monthlyPhaseSummary && (
        <MonthlyPhaseSummary
          monthlyData={summary.monthlyPhaseSummary}
          hoursUnit={hoursUnit}
          showDifference={showDifference}
          showBaseline={showBaseline}
          showPlanned={showPlanned}
          showForecast={showForecast}
          onShowDifferenceChange={setShowDifference}
          onShowBaselineChange={(value) =>
            changeColumnVisibility("baseline", value)
          }
          onShowPlannedChange={(value) =>
            changeColumnVisibility("planned", value)
          }
          onShowForecastChange={(value) =>
            changeColumnVisibility("forecast", value)
          }
          isColumnToggleDisabled={isColumnToggleDisabled}
        />
      )}
    </div>
  );
}
