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
import { Calendar, Layers } from "lucide-react";
import React, { useMemo } from "react";
import { MonthlyAssigneeSummary as MonthlyAssigneeSummaryData } from "@/applications/wbs/query/wbs-summary-result";
import {
  HoursUnit,
  convertHours,
  getUnitSuffix,
} from "@/utils/hours-converter";

interface MonthlyPhaseSummaryProps {
  monthlyData: MonthlyAssigneeSummaryData;
  hoursUnit: HoursUnit;
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
}: MonthlyPhaseSummaryProps) {
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
    }, [monthlyData, hoursUnit]);

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
        </div>
      </CardHeader>
      <CardContent className="p-1">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50">
                <TableHead className="font-semibold sticky left-0 bg-gray-50 z-10">
                  工程
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
              {phases.map((phase) => (
                <TableRow key={phase}>
                  <TableCell className="font-medium sticky left-0 bg-white z-10">
                    {phase}
                  </TableCell>
                  {monthlyData.months.map((month) => {
                    const cell = cells.get(`${month}|${phase}`) || {
                      taskCount: 0,
                      plannedHours: 0,
                      actualHours: 0,
                      difference: 0,
                    };
                    return (
                      <React.Fragment key={month}>
                        <TableCell className="text-right text-sm">
                          {cell.plannedHours > 0
                            ? formatNumber(cell.plannedHours)
                            : "-"}
                        </TableCell>
                        <TableCell className="text-right text-sm">
                          {cell.actualHours > 0
                            ? formatNumber(cell.actualHours)
                            : "-"}
                        </TableCell>
                        <TableCell
                          className={`text-right text-sm ${getDifferenceColor(
                            cell.difference
                          )}`}
                        >
                          {cell.plannedHours > 0 || cell.actualHours > 0
                            ? formatNumber(cell.difference)
                            : "-"}
                        </TableCell>
                      </React.Fragment>
                    );
                  })}
                  {/* 行合計 */}
                  <TableCell className="text-right text-sm font-semibold bg-gray-50">
                    {formatNumber(phaseTotals[phase]?.plannedHours || 0)}
                  </TableCell>
                  <TableCell className="text-right text-sm font-semibold bg-gray-50">
                    {formatNumber(phaseTotals[phase]?.actualHours || 0)}
                  </TableCell>
                  <TableCell
                    className={`text-right text-sm font-semibold bg-gray-50 ${getDifferenceColor(
                      phaseTotals[phase]?.difference || 0
                    )}`}
                  >
                    {formatNumber(phaseTotals[phase]?.difference || 0)}
                  </TableCell>
                </TableRow>
              ))}
              {/* 月別合計行 */}
              <TableRow className="bg-gray-100 font-semibold">
                <TableCell className="sticky left-0 bg-gray-100 z-10">
                  合計
                </TableCell>
                {monthlyData.months.map((month) => {
                  const total = monthlyTotals[month];
                  return (
                    <React.Fragment key={month}>
                      <TableCell className="text-right text-sm">
                        {formatNumber(total?.plannedHours || 0)}
                      </TableCell>
                      <TableCell className="text-right text-sm">
                        {formatNumber(total?.actualHours || 0)}
                      </TableCell>
                      <TableCell
                        className={`text-right text-sm ${getDifferenceColor(
                          total?.difference || 0
                        )}`}
                      >
                        {formatNumber(total?.difference || 0)}
                      </TableCell>
                    </React.Fragment>
                  );
                })}
                {/* 全体合計 */}
                <TableCell className="text-right text-sm bg-gray-200">
                  {formatNumber(grandTotal.plannedHours)}
                </TableCell>
                <TableCell className="text-right text-sm bg-gray-200">
                  {formatNumber(grandTotal.actualHours)}
                </TableCell>
                <TableCell
                  className={`text-right text-sm bg-gray-200 ${getDifferenceColor(
                    grandTotal.difference
                  )}`}
                >
                  {formatNumber(grandTotal.difference)}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
