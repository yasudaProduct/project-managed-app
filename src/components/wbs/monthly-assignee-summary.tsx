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
import { Calendar, Users } from "lucide-react";
import React from "react";
import { MonthlyAssigneeSummary as MonthlyAssigneeSummaryData } from "@/applications/wbs/query/wbs-summary-result";

interface MonthlyAssigneeSummaryProps {
  monthlyData: MonthlyAssigneeSummaryData;
}

export function MonthlyAssigneeSummary({ monthlyData }: MonthlyAssigneeSummaryProps) {

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
                {monthlyData.months.map((month) => (
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
                {[...monthlyData.months, '合計'].map((period) => (
                  <React.Fragment key={period}>
                    <TableHead className="text-right text-xs">予定</TableHead>
                    <TableHead className="text-right text-xs">実績</TableHead>
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
                    const data = monthlyData.data.find(d => d.month === month && d.assignee === assignee);
                    const plannedHours = data?.plannedHours || 0;
                    const actualHours = data?.actualHours || 0;
                    const difference = data?.difference || 0;
                    return (
                      <React.Fragment key={month}>
                        <TableCell className="text-right text-sm">
                          {plannedHours > 0 ? formatNumber(plannedHours) : '-'}
                        </TableCell>
                        <TableCell className="text-right text-sm">
                          {actualHours > 0 ? formatNumber(actualHours) : '-'}
                        </TableCell>
                        <TableCell className={`text-right text-sm ${getDifferenceColor(difference)}`}>
                          {plannedHours > 0 || actualHours > 0 ? formatNumber(difference) : '-'}
                        </TableCell>
                      </React.Fragment>
                    );
                  })}
                  {/* 担当者合計 */}
                  <TableCell className="text-right text-sm font-semibold bg-gray-50">
                    {formatNumber(monthlyData.assigneeTotals[assignee].plannedHours)}
                  </TableCell>
                  <TableCell className="text-right text-sm font-semibold bg-gray-50">
                    {formatNumber(monthlyData.assigneeTotals[assignee].actualHours)}
                  </TableCell>
                  <TableCell className={`text-right text-sm font-semibold bg-gray-50 ${getDifferenceColor(monthlyData.assigneeTotals[assignee].difference)}`}>
                    {formatNumber(monthlyData.assigneeTotals[assignee].difference)}
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
                      <TableCell className={`text-right text-sm ${getDifferenceColor(difference)}`}>
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
                <TableCell className={`text-right text-sm bg-gray-200 ${getDifferenceColor(monthlyData.grandTotal.difference)}`}>
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