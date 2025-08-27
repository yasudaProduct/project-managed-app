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
import { useWbsSummary } from "@/hooks/use-wbs-summary";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { exportPhaseSummary, exportAssigneeSummary, copyPhaseSummaryToClipboard, copyAssigneeSummaryToClipboard } from "@/utils/export-table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useState } from "react";
import { HoursUnit, HOURS_UNIT_LABELS, convertHours, getUnitSuffix } from "@/utils/hours-converter";
import { Copy } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface WbsSummaryTablesProps {
  projectId: string;
  wbsId: string;
}

export function WbsSummaryTables({ projectId, wbsId }: WbsSummaryTablesProps) {
  const { data: summary, isLoading, error } = useWbsSummary(projectId, wbsId);
  const [hoursUnit, setHoursUnit] = useState<HoursUnit>('hours');

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
        <Select value={hoursUnit} onValueChange={(value) => setHoursUnit(value as HoursUnit)}>
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
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={async () => {
                    try {
                      await copyPhaseSummaryToClipboard(summary.phaseSummaries, summary.phaseTotal, hoursUnit);
                      toast({ description: "TSV形式でクリップボードにコピーしました" });
                    } catch (error) {
                      toast({ 
                        description: "コピーに失敗しました", 
                        variant: "destructive" 
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
                      onClick={() => exportPhaseSummary(summary.phaseSummaries, summary.phaseTotal, 'csv', hoursUnit)}
                    >
                      CSV形式で出力
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => exportPhaseSummary(summary.phaseSummaries, summary.phaseTotal, 'tsv', hoursUnit)}
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
                  <TableHead className="text-right font-semibold">
                    予定工数({getUnitSuffix(hoursUnit)})
                  </TableHead>
                  <TableHead className="text-right font-semibold">
                    実績工数({getUnitSuffix(hoursUnit)})
                  </TableHead>
                  <TableHead className="text-right font-semibold">
                    差分
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {summary.phaseSummaries.map((item, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">{item.phase}</TableCell>
                    <TableCell className="text-center">
                      {item.taskCount}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatNumber(item.plannedHours)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatNumber(item.actualHours)}
                    </TableCell>
                    <TableCell
                      className={`text-right ${getDifferenceColor(
                        item.difference
                      )}`}
                    >
                      {formatNumber(item.difference)}
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow className="bg-gray-50 font-semibold">
                  <TableCell>合計</TableCell>
                  <TableCell className="text-center">
                    {summary.phaseTotal.taskCount}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatNumber(summary.phaseTotal.plannedHours)}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatNumber(summary.phaseTotal.actualHours)}
                  </TableCell>
                  <TableCell
                    className={`text-right ${getDifferenceColor(
                      summary.phaseTotal.difference
                    )}`}
                  >
                    {formatNumber(summary.phaseTotal.difference)}
                  </TableCell>
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
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    onClick={async () => {
                      try {
                        await copyAssigneeSummaryToClipboard(summary.assigneeSummaries, summary.assigneeTotal, hoursUnit);
                        toast({ description: "TSV形式でクリップボードにコピーしました" });
                      } catch (error) {
                        toast({ 
                          description: "コピーに失敗しました", 
                          variant: "destructive" 
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
                        onClick={() => exportAssigneeSummary(summary.assigneeSummaries, summary.assigneeTotal, 'csv', hoursUnit)}
                      >
                        CSV形式で出力
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => exportAssigneeSummary(summary.assigneeSummaries, summary.assigneeTotal, 'tsv', hoursUnit)}
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
                  <TableHead className="text-right font-semibold">
                    予定工数({getUnitSuffix(hoursUnit)})
                  </TableHead>
                  <TableHead className="text-right font-semibold">
                    実績工数({getUnitSuffix(hoursUnit)})
                  </TableHead>
                  <TableHead className="text-right font-semibold">
                    差分
                  </TableHead>
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
                    <TableCell className="text-right">
                      {formatNumber(item.plannedHours)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatNumber(item.actualHours)}
                    </TableCell>
                    <TableCell
                      className={`text-right ${getDifferenceColor(
                        item.difference
                      )}`}
                    >
                      {formatNumber(item.difference)}
                    </TableCell>
                  </TableRow>
                ))}
                {summary.assigneeSummaries.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={5}
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
                    <TableCell className="text-right">
                      {formatNumber(summary.assigneeTotal.plannedHours)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatNumber(summary.assigneeTotal.actualHours)}
                    </TableCell>
                    <TableCell
                      className={`text-right ${getDifferenceColor(
                        summary.assigneeTotal.difference
                      )}`}
                    >
                      {formatNumber(summary.assigneeTotal.difference)}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* 月別・担当者別集計表 */}
      <MonthlyAssigneeSummary monthlyData={summary.monthlyAssigneeSummary} hoursUnit={hoursUnit} />
    </div>
  );
}
