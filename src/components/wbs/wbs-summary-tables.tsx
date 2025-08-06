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
import { Layers, Users } from "lucide-react";
import { WbsTask } from "@/types/wbs";
import { MonthlyAssigneeSummary } from "./monthly-assignee-summary";

interface WbsSummaryTablesProps {
  tasks: WbsTask[];
  phases: Array<{ name: string }>;
  assignees: Array<{ assignee: { displayName: string } | null }> | null;
}

export function WbsSummaryTables({
  tasks,
  phases,
}: WbsSummaryTablesProps) {
  // 工程別集計
  const phasesSummary = useMemo(() => {
    const summary = new Map<
      string,
      { planned: number; actual: number; taskCount: number }
    >();

    // 初期化
    phases.forEach((phase) => {
      summary.set(phase.name, { planned: 0, actual: 0, taskCount: 0 });
    });

    // タスクを集計
    tasks.forEach((task) => {
      const phaseName =
        task.phase?.name ||
        (typeof task.phase === "string" ? task.phase : null);
      if (phaseName && summary.has(phaseName)) {
        const current = summary.get(phaseName)!;
        summary.set(phaseName, {
          planned: current.planned + (task.yoteiKosu ?? 0),
          actual: current.actual + (task.jissekiKosu ?? 0),
          taskCount: current.taskCount + 1,
        });
      }
    });

    return Array.from(summary.entries()).map(([phase, data]) => ({
      phase,
      ...data,
    }));
  }, [tasks, phases]);

  // 担当者別集計
  const assigneesSummary = useMemo(() => {
    const summary = new Map<
      string,
      { planned: number; actual: number; taskCount: number }
    >();

    // タスクを集計
    tasks.forEach((task) => {
      if (task.assignee && task.assignee.displayName) {
        const key = task.assignee.displayName;
        const current = summary.get(key) || {
          planned: 0,
          actual: 0,
          taskCount: 0,
        };
        summary.set(key, {
          planned: current.planned + (task.yoteiKosu ?? 0),
          actual: current.actual + (task.jissekiKosu ?? 0),
          taskCount: current.taskCount + 1,
        });
      }
    });

    return Array.from(summary.entries()).map(([assignee, data]) => ({
      assignee,
      ...data,
    }));
  }, [tasks]);

  // 合計計算
  const phasesTotal = phasesSummary.reduce(
    (acc, item) => ({
      planned: acc.planned + item.planned,
      actual: acc.actual + item.actual,
      taskCount: acc.taskCount + item.taskCount,
    }),
    { planned: 0, actual: 0, taskCount: 0 }
  );

  const assigneesTotal = assigneesSummary.reduce(
    (acc, item) => ({
      planned: acc.planned + item.planned,
      actual: acc.actual + item.actual,
      taskCount: acc.taskCount + item.taskCount,
    }),
    { planned: 0, actual: 0, taskCount: 0 }
  );

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

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 工程別集計表 */}
        <Card className="rounded-none shadow-none">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <Layers className="h-5 w-5 text-blue-600" />
              工程別集計表
            </CardTitle>
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
                    予定工数
                  </TableHead>
                  <TableHead className="text-right font-semibold">
                    実績工数
                  </TableHead>
                  <TableHead className="text-right font-semibold">
                    差分
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {phasesSummary.map((item, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">{item.phase}</TableCell>
                    <TableCell className="text-center">
                      {item.taskCount}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatNumber(item.planned)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatNumber(item.actual)}
                    </TableCell>
                    <TableCell
                      className={`text-right ${getDifferenceColor(
                        item.actual - item.planned
                      )}`}
                    >
                      {formatNumber(item.actual - item.planned)}
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow className="bg-gray-50 font-semibold">
                  <TableCell>合計</TableCell>
                  <TableCell className="text-center">
                    {phasesTotal.taskCount}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatNumber(phasesTotal.planned)}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatNumber(phasesTotal.actual)}
                  </TableCell>
                  <TableCell
                    className={`text-right ${getDifferenceColor(
                      phasesTotal.actual - phasesTotal.planned
                    )}`}
                  >
                    {formatNumber(phasesTotal.actual - phasesTotal.planned)}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* 担当者別集計表 */}
        <Card className="rounded-none shadow-none">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-600" />
              担当者別集計表
            </CardTitle>
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
                    予定工数
                  </TableHead>
                  <TableHead className="text-right font-semibold">
                    実績工数
                  </TableHead>
                  <TableHead className="text-right font-semibold">
                    差分
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {assigneesSummary.map((item, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">{item.assignee}</TableCell>
                    <TableCell className="text-center">
                      {item.taskCount}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatNumber(item.planned)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatNumber(item.actual)}
                    </TableCell>
                    <TableCell
                      className={`text-right ${getDifferenceColor(
                        item.actual - item.planned
                      )}`}
                    >
                      {formatNumber(item.actual - item.planned)}
                    </TableCell>
                  </TableRow>
                ))}
                {assigneesSummary.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="text-center text-gray-500 py-4"
                    >
                      担当者が割り当てられたタスクがありません
                    </TableCell>
                  </TableRow>
                )}
                {assigneesSummary.length > 0 && (
                  <TableRow className="bg-gray-50 font-semibold">
                    <TableCell>合計</TableCell>
                    <TableCell className="text-center">
                      {assigneesTotal.taskCount}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatNumber(assigneesTotal.planned)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatNumber(assigneesTotal.actual)}
                    </TableCell>
                    <TableCell
                      className={`text-right ${getDifferenceColor(
                        assigneesTotal.actual - assigneesTotal.planned
                      )}`}
                    >
                      {formatNumber(assigneesTotal.actual - assigneesTotal.planned)}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* 月別・担当者別集計表 */}
      <MonthlyAssigneeSummary tasks={tasks} />
    </div>
  );
}