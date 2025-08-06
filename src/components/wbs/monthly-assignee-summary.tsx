"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Calendar, Users } from "lucide-react";
import { WbsTask } from "@/types/wbs";
import React from "react";

interface MonthlyAssigneeSummaryProps {
  tasks: WbsTask[];
}

interface MonthlyData {
  [yearMonth: string]: {
    [assignee: string]: {
      planned: number;
      actual: number;
      taskCount: number;
    };
  };
}

export function MonthlyAssigneeSummary({ tasks }: MonthlyAssigneeSummaryProps) {
  // 月別・担当者別に集計
  const monthlySummary = useMemo(() => {
    const data: MonthlyData = {};
    const assignees = new Set<string>();
    const months = new Set<string>();

    tasks.forEach((task) => {
      if (!task.assignee?.displayName) return;

      const assigneeName = task.assignee.displayName;
      assignees.add(assigneeName);

      // 予定期間で月を判定
      if (task.yoteiStart) {
        const date = new Date(task.yoteiStart);
        const yearMonth = `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, '0')}`;
        months.add(yearMonth);

        if (!data[yearMonth]) {
          data[yearMonth] = {};
        }
        if (!data[yearMonth][assigneeName]) {
          data[yearMonth][assigneeName] = { planned: 0, actual: 0, taskCount: 0 };
        }

        data[yearMonth][assigneeName].planned += task.yoteiKosu ?? 0;
        data[yearMonth][assigneeName].actual += task.jissekiKosu ?? 0;
        data[yearMonth][assigneeName].taskCount += 1;
      }
    });

    // ソートされた月のリストを作成
    const sortedMonths = Array.from(months).sort();
    const sortedAssignees = Array.from(assignees).sort();

    return {
      data,
      months: sortedMonths,
      assignees: sortedAssignees,
    };
  }, [tasks]);

  const formatNumber = (num: number) => {
    return num.toLocaleString("ja-JP", {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    });
  };

  const getDifferenceColor = (difference: number) => {
    if (difference > 0) return "text-red-600";
    if (difference === 0) return "text-green-600";
    return "text-blue-600";
  };

  // 各月の合計を計算
  const monthlyTotals = useMemo(() => {
    const totals: { [month: string]: { planned: number; actual: number; taskCount: number } } = {};
    
    monthlySummary.months.forEach(month => {
      totals[month] = { planned: 0, actual: 0, taskCount: 0 };
      Object.values(monthlySummary.data[month] || {}).forEach(data => {
        totals[month].planned += data.planned;
        totals[month].actual += data.actual;
        totals[month].taskCount += data.taskCount;
      });
    });
    
    return totals;
  }, [monthlySummary]);

  // 各担当者の合計を計算
  const assigneeTotals = useMemo(() => {
    const totals: { [assignee: string]: { planned: number; actual: number; taskCount: number } } = {};
    
    monthlySummary.assignees.forEach(assignee => {
      totals[assignee] = { planned: 0, actual: 0, taskCount: 0 };
      monthlySummary.months.forEach(month => {
        const data = monthlySummary.data[month]?.[assignee];
        if (data) {
          totals[assignee].planned += data.planned;
          totals[assignee].actual += data.actual;
          totals[assignee].taskCount += data.taskCount;
        }
      });
    });
    
    return totals;
  }, [monthlySummary]);

  // 全体の合計
  const grandTotal = useMemo(() => {
    const total = { planned: 0, actual: 0, taskCount: 0 };
    Object.values(assigneeTotals).forEach(data => {
      total.planned += data.planned;
      total.actual += data.actual;
      total.taskCount += data.taskCount;
    });
    return total;
  }, [assigneeTotals]);

  if (monthlySummary.months.length === 0 || monthlySummary.assignees.length === 0) {
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
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <Calendar className="h-5 w-5 text-blue-600" />
          <Users className="h-5 w-5 text-blue-600" />
          月別・担当者別集計表
        </CardTitle>
      </CardHeader>
      <CardContent className="p-1">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50">
                <TableHead className="font-semibold sticky left-0 bg-gray-50 z-10">
                  担当者
                </TableHead>
                {monthlySummary.months.map((month) => (
                  <TableHead key={month} className="text-center font-semibold min-w-[120px]" colSpan={3}>
                    {month}
                  </TableHead>
                ))}
                <TableHead className="text-center font-semibold min-w-[120px]" colSpan={3}>
                  合計
                </TableHead>
              </TableRow>
              <TableRow className="bg-gray-50">
                <TableHead className="sticky left-0 bg-gray-50 z-10"></TableHead>
                {[...monthlySummary.months, '合計'].map((period) => (
                  <React.Fragment key={period}>
                    <TableHead className="text-right text-xs">予定</TableHead>
                    <TableHead className="text-right text-xs">実績</TableHead>
                    <TableHead className="text-right text-xs">差分</TableHead>
                  </React.Fragment>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {monthlySummary.assignees.map((assignee) => (
                <TableRow key={assignee}>
                  <TableCell className="font-medium sticky left-0 bg-white z-10">
                    {assignee}
                  </TableCell>
                  {monthlySummary.months.map((month) => {
                    const data = monthlySummary.data[month]?.[assignee] || { planned: 0, actual: 0, taskCount: 0 };
                    const difference = data.actual - data.planned;
                    return (
                      <React.Fragment key={month}>
                        <TableCell className="text-right text-sm">
                          {data.planned > 0 ? formatNumber(data.planned) : '-'}
                        </TableCell>
                        <TableCell className="text-right text-sm">
                          {data.actual > 0 ? formatNumber(data.actual) : '-'}
                        </TableCell>
                        <TableCell className={`text-right text-sm ${getDifferenceColor(difference)}`}>
                          {data.planned > 0 || data.actual > 0 ? formatNumber(difference) : '-'}
                        </TableCell>
                      </React.Fragment>
                    );
                  })}
                  {/* 担当者合計 */}
                  <TableCell className="text-right text-sm font-semibold bg-gray-50">
                    {formatNumber(assigneeTotals[assignee].planned)}
                  </TableCell>
                  <TableCell className="text-right text-sm font-semibold bg-gray-50">
                    {formatNumber(assigneeTotals[assignee].actual)}
                  </TableCell>
                  <TableCell className={`text-right text-sm font-semibold bg-gray-50 ${getDifferenceColor(assigneeTotals[assignee].actual - assigneeTotals[assignee].planned)}`}>
                    {formatNumber(assigneeTotals[assignee].actual - assigneeTotals[assignee].planned)}
                  </TableCell>
                </TableRow>
              ))}
              {/* 月別合計行 */}
              <TableRow className="bg-gray-100 font-semibold">
                <TableCell className="sticky left-0 bg-gray-100 z-10">
                  合計
                </TableCell>
                {monthlySummary.months.map((month) => {
                  const total = monthlyTotals[month];
                  const difference = total.actual - total.planned;
                  return (
                    <React.Fragment key={month}>
                      <TableCell className="text-right text-sm">
                        {formatNumber(total.planned)}
                      </TableCell>
                      <TableCell className="text-right text-sm">
                        {formatNumber(total.actual)}
                      </TableCell>
                      <TableCell className={`text-right text-sm ${getDifferenceColor(difference)}`}>
                        {formatNumber(difference)}
                      </TableCell>
                    </React.Fragment>
                  );
                })}
                {/* 全体合計 */}
                <TableCell className="text-right text-sm bg-gray-200">
                  {formatNumber(grandTotal.planned)}
                </TableCell>
                <TableCell className="text-right text-sm bg-gray-200">
                  {formatNumber(grandTotal.actual)}
                </TableCell>
                <TableCell className={`text-right text-sm bg-gray-200 ${getDifferenceColor(grandTotal.actual - grandTotal.planned)}`}>
                  {formatNumber(grandTotal.actual - grandTotal.planned)}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}