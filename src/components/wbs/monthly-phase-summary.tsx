"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table } from "@/components/ui/table"; // parent keeps import for consistency
import { Calendar, Layers, Download } from "lucide-react";
import React, { useMemo } from "react";
import { MonthlyAssigneeSummary as MonthlyAssigneeSummaryData } from "@/applications/wbs/query/wbs-summary-result";
import {
  HoursUnit,
  convertHours,
  getUnitSuffix,
} from "@/utils/hours-converter";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Copy } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import {
  copyMonthlyPhaseSummaryToClipboard,
  exportMonthlyPhaseSummary,
} from "@/utils/export-table";
import { Checkbox } from "@/components/ui/checkbox";
import { Settings } from "lucide-react";
import { useState } from "react";
import MonthlySummaryTable, { SummaryCell } from "@/components/wbs/monthly-summary-table";

interface MonthlyPhaseSummaryProps {
  monthlyData: MonthlyAssigneeSummaryData;
  hoursUnit: HoursUnit;
  showDifference?: boolean;
  showBaseline?: boolean;
  showForecast?: boolean;
  onShowDifferenceChange?: (value: boolean) => void;
  onShowBaselineChange?: (value: boolean) => void;
  onShowForecastChange?: (value: boolean) => void;
}

type Cell = {
  taskCount: number;
  plannedHours: number;
  actualHours: number;
  difference: number;
};

export function MonthlyPhaseSummary({
  monthlyData,
  hoursUnit,
  showDifference = true,
  showBaseline = false,
  showForecast = false,
  onShowDifferenceChange,
  onShowBaselineChange,
  onShowForecastChange,
}: MonthlyPhaseSummaryProps) {
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

  const { phases, cells, monthlyTotals, phaseTotals, grandTotal } =
    useMemo(() => {
      const phaseSet = new Set<string>();
      const cellMap = new Map<string, Cell>(); // key: `${month}|${phase}`

      // 集計元: monthlyData.data の各 (assignee, month) の taskDetails
      for (const entry of monthlyData.data) {
        const month = entry.month;
        const details = entry.taskDetails || [];
        for (const td of details) {
          const phase = td.phase || "未設定";
          phaseSet.add(phase);

          const alloc = td.monthlyAllocations.find((ma) => ma.month === month);
          if (!alloc) continue;

          const key = `${month}|${phase}`;
          const existing = cellMap.get(key) || {
            taskCount: 0,
            plannedHours: 0,
            actualHours: 0,
            difference: 0,
          };

          // その月に配分があるタスクのみカウント
          if (
            alloc.allocatedPlannedHours > 0 ||
            alloc.allocatedActualHours > 0
          ) {
            existing.taskCount += 1;
          }
          existing.plannedHours += alloc.allocatedPlannedHours || 0;
          existing.actualHours += alloc.allocatedActualHours || 0;
          existing.difference = existing.actualHours - existing.plannedHours;

          cellMap.set(key, existing);
        }
      }

      const phases = Array.from(phaseSet).sort();

      // 月別合計（工程横断）
      const monthlyTotals: Record<string, Cell> = {};
      for (const month of monthlyData.months) {
        monthlyTotals[month] = {
          taskCount: 0,
          plannedHours: 0,
          actualHours: 0,
          difference: 0,
        };
        for (const phase of phases) {
          const c = cellMap.get(`${month}|${phase}`);
          if (!c) continue;
          monthlyTotals[month].taskCount += c.taskCount;
          monthlyTotals[month].plannedHours += c.plannedHours;
          monthlyTotals[month].actualHours += c.actualHours;
          monthlyTotals[month].difference += c.difference;
        }
      }

      // 工程別合計（月横断）
      const phaseTotals: Record<string, Cell> = {};
      for (const phase of phases) {
        phaseTotals[phase] = {
          taskCount: 0,
          plannedHours: 0,
          actualHours: 0,
          difference: 0,
        };
        for (const month of monthlyData.months) {
          const c = cellMap.get(`${month}|${phase}`);
          if (!c) continue;
          phaseTotals[phase].taskCount += c.taskCount;
          phaseTotals[phase].plannedHours += c.plannedHours;
          phaseTotals[phase].actualHours += c.actualHours;
          phaseTotals[phase].difference += c.difference;
        }
      }

      // 全体合計
      const grandTotal: Cell = {
        taskCount: 0,
        plannedHours: 0,
        actualHours: 0,
        difference: 0,
      };
      for (const phase of phases) {
        grandTotal.taskCount += phaseTotals[phase].taskCount;
        grandTotal.plannedHours += phaseTotals[phase].plannedHours;
        grandTotal.actualHours += phaseTotals[phase].actualHours;
        grandTotal.difference += phaseTotals[phase].difference;
      }

      return { phases, cells: cellMap, monthlyTotals, phaseTotals, grandTotal };
    }, [monthlyData]);

  if (monthlyData.months.length === 0) {
    return (
      <Card className="rounded-none shadow-none">
        <CardHeader>
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Calendar className="h-5 w-5 text-blue-600" />
            <Layers className="h-5 w-5 text-blue-600" />
            月別・工程別集計表
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
            <Layers className="h-5 w-5 text-blue-600" />
            月別・工程別集計表
          </CardTitle>
          <div className="flex gap-2">
            <DropdownMenu
              open={isSettingsOpen}
              onOpenChange={setIsSettingsOpen}
            >
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
                      id="phase-show-difference"
                      checked={showDifference}
                      onCheckedChange={(checked) =>
                        onShowDifferenceChange?.(!!checked)
                      }
                    />
                    <label
                      htmlFor="phase-show-difference"
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                    >
                      月毎の差分を表示
                    </label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="phase-show-baseline"
                      checked={showBaseline}
                      onCheckedChange={(checked) =>
                        onShowBaselineChange?.(!!checked)
                      }
                    />
                    <label
                      htmlFor="phase-show-baseline"
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                    >
                      月毎の基準を表示
                    </label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="phase-show-forecast"
                      checked={showForecast}
                      onCheckedChange={(checked) =>
                        onShowForecastChange?.(!!checked)
                      }
                    />
                    <label
                      htmlFor="phase-show-forecast"
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
                  await copyMonthlyPhaseSummaryToClipboard(
                    {
                      months: monthlyData.months,
                      phases,
                      cells,
                      monthlyTotals,
                      phaseTotals,
                      grandTotal,
                    },
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
                    exportMonthlyPhaseSummary(
                      {
                        months: monthlyData.months,
                        phases,
                        cells,
                        monthlyTotals,
                        phaseTotals,
                        grandTotal,
                      },
                      "csv",
                      hoursUnit
                    )
                  }
                >
                  CSV形式で出力
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() =>
                    exportMonthlyPhaseSummary(
                      {
                        months: monthlyData.months,
                        phases,
                        cells,
                        monthlyTotals,
                        phaseTotals,
                        grandTotal,
                      },
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
          <MonthlySummaryTable
            months={monthlyData.months}
            rows={phases}
            firstColumnHeader="工程"
            firstColumnWidth={200}
            hoursUnit={hoursUnit}
            showDifference={showDifference}
            showBaseline={showBaseline}
            showForecast={showForecast}
            getCell={(phase, month) => {
              const cell = cells.get(`${month}|${phase}`) || {
                taskCount: 0,
                plannedHours: 0,
                actualHours: 0,
                difference: 0,
              };
              const forecast = cell.actualHours > 0 ? cell.actualHours : cell.plannedHours;
              return {
                plannedHours: cell.plannedHours,
                actualHours: cell.actualHours,
                difference: cell.difference,
                baselineHours: 0, // 未実装
                forecastHours: forecast,
              } as SummaryCell;
            }}
            rowTotals={Object.fromEntries(
              phases.map((p) => [
                p,
                {
                  plannedHours: phaseTotals[p]?.plannedHours || 0,
                  actualHours: phaseTotals[p]?.actualHours || 0,
                  difference: phaseTotals[p]?.difference || 0,
                },
              ])
            )}
            monthlyTotals={Object.fromEntries(
              monthlyData.months.map((m) => [
                m,
                {
                  plannedHours: monthlyTotals[m]?.plannedHours || 0,
                  actualHours: monthlyTotals[m]?.actualHours || 0,
                  difference: monthlyTotals[m]?.difference || 0,
                  baselineHours: 0,
                  forecastHours:
                    (monthlyTotals[m]?.actualHours || 0) > 0
                      ? monthlyTotals[m]?.actualHours || 0
                      : monthlyTotals[m]?.plannedHours || 0,
                },
              ])
            )}
            grandTotal={{
              plannedHours: grandTotal.plannedHours,
              actualHours: grandTotal.actualHours,
              difference: grandTotal.difference,
              baselineHours: 0,
              forecastHours:
                grandTotal.actualHours > 0 ? grandTotal.actualHours : grandTotal.plannedHours,
            }}
            stickyFirstColumn={true}
          />
        </div>
      </CardContent>
    </Card>
  );
}
