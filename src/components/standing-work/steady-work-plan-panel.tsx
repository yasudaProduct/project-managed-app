"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, Pencil, Trash2, Repeat } from "lucide-react";
import { STEADY_PLAN_UNIT_LABELS, type SteadyWorkPlanDto, type SteadyWorkTaskDto } from "@/types/steady-work-plan";
import { listSteadyWorkTasks, deleteSteadyWorkPlan } from "@/app/wbs/[id]/actions/steady-work-plan-actions";
import { toast } from "@/hooks/use-toast";
import { formatDate } from "@/utils/date-util";
import { SteadyWorkPlanDialog } from "./steady-work-plan-dialog";
import { SteadyWorkTaskDialog } from "./steady-work-task-dialog";

interface SteadyWorkPlanPanelProps {
  wbsId: number;
  initialTasks: SteadyWorkTaskDto[];
  /** 定常タスクに割り当てられる WBS 担当者 */
  assignees: Array<{ id: number; displayName: string }>;
}

function planPeriodText(plan: SteadyWorkPlanDto): string {
  const from = formatDate(new Date(plan.validFrom), "YYYY/MM/DD");
  const to = plan.validTo ? formatDate(new Date(plan.validTo), "YYYY/MM/DD") : "無期限";
  return `${from} 〜 ${to}`;
}

/**
 * 定常枠タブ（docs/plans/non-project-work-management.md §6.7）。
 * 常設プロジェクトのタスクごとに担当者と定常枠（単位・時間・有効期間）を表示し、追加・編集・削除する。
 */
export function SteadyWorkPlanPanel({ wbsId, initialTasks, assignees }: SteadyWorkPlanPanelProps) {
  const [tasks, setTasks] = useState<SteadyWorkTaskDto[]>(initialTasks);
  const [planDialog, setPlanDialog] = useState<{
    task: { taskId: number; name: string };
    plan: SteadyWorkPlanDto | null;
  } | null>(null);
  const [isTaskDialogOpen, setIsTaskDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ task: SteadyWorkTaskDto; plan: SteadyWorkPlanDto } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const reload = async () => {
    try {
      setTasks(await listSteadyWorkTasks(wbsId));
    } catch {
      toast({ title: "エラー", description: "定常枠の再取得に失敗しました", variant: "destructive" });
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      const result = await deleteSteadyWorkPlan({ wbsId, id: deleteTarget.plan.id });
      if (result.success) {
        toast({ title: "定常枠を削除しました", description: deleteTarget.task.name });
        setDeleteTarget(null);
        await reload();
      } else {
        toast({ title: "削除エラー", description: result.error, variant: "destructive" });
      }
    } catch {
      toast({ title: "エラー", description: "予期しないエラーが発生しました", variant: "destructive" });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between space-y-0">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Repeat className="h-5 w-5" />
            定常枠
          </CardTitle>
          <CardDescription>
            定常タスクごとに担当者が使う予定量（h/日 または h/月）と有効期間を設定します。担当者別の負荷に反映されます。
          </CardDescription>
        </div>
        <Button onClick={() => setIsTaskDialogOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          定常タスクを追加
        </Button>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[100px]">タスクNo</TableHead>
              <TableHead>タスク名</TableHead>
              <TableHead className="w-[140px]">担当者</TableHead>
              <TableHead>定常枠</TableHead>
              <TableHead className="w-[120px]">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tasks.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                  定常タスクがありません。「定常タスクを追加」から登録してください。
                </TableCell>
              </TableRow>
            )}
            {tasks.map((task) => (
              <TableRow key={task.taskId}>
                <TableCell className="font-mono text-sm">{task.taskNo}</TableCell>
                <TableCell className="font-medium">{task.name}</TableCell>
                <TableCell>
                  {task.assignee ? (
                    task.assignee.displayName
                  ) : (
                    <Badge variant="outline" className="text-muted-foreground">
                      未割当
                    </Badge>
                  )}
                </TableCell>
                <TableCell>
                  {task.plans.length === 0 ? (
                    <span className="text-sm text-muted-foreground">定常枠なし</span>
                  ) : (
                    <ul className="space-y-1">
                      {task.plans.map((plan) => (
                        <li key={plan.id} className="flex items-center gap-2 text-sm">
                          <Badge variant="secondary">
                            {plan.hours} {STEADY_PLAN_UNIT_LABELS[plan.unit]}
                          </Badge>
                          <span>{planPeriodText(plan)}</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2"
                            aria-label="編集"
                            title="編集"
                            onClick={() => setPlanDialog({ task: { taskId: task.taskId, name: task.name }, plan })}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-red-600"
                            aria-label="削除"
                            title="削除"
                            onClick={() => setDeleteTarget({ task, plan })}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </li>
                      ))}
                    </ul>
                  )}
                </TableCell>
                <TableCell>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={!task.assignee}
                    title={task.assignee ? undefined : "担当者を設定すると枠を追加できます"}
                    onClick={() => setPlanDialog({ task: { taskId: task.taskId, name: task.name }, plan: null })}
                  >
                    枠を追加
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>

      <SteadyWorkPlanDialog
        wbsId={wbsId}
        task={planDialog?.task ?? null}
        plan={planDialog?.plan ?? null}
        isOpen={planDialog !== null}
        onClose={() => setPlanDialog(null)}
        onSaved={reload}
      />

      <SteadyWorkTaskDialog
        wbsId={wbsId}
        assignees={assignees}
        isOpen={isTaskDialogOpen}
        onClose={() => setIsTaskDialogOpen(false)}
        onSaved={reload}
      />

      <AlertDialog open={deleteTarget !== null} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>定常枠を削除しますか？</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget
                ? `${deleteTarget.task.name} の定常枠（${deleteTarget.plan.hours} ${STEADY_PLAN_UNIT_LABELS[deleteTarget.plan.unit]}、${planPeriodText(deleteTarget.plan)}）を削除します。この操作は取り消せません。`
                : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>キャンセル</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete} disabled={isDeleting} className="bg-red-600 hover:bg-red-700">
              {isDeleting ? "削除中..." : "削除する"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
