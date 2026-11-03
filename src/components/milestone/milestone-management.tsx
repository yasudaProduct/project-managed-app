"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import type { MilestoneForecastDto } from "@/applications/milestone/milestone-application-service";
import {
  MILESTONE_TARGET_TYPE_LABELS,
  MILESTONE_FORECAST_STATUS_LABELS,
  type MilestoneForecastStatus,
} from "@/types/milestone";
import { MilestoneModal } from "./milestone-modal";
import { deleteMilestone } from "@/app/wbs/[id]/actions/milestone-actions";
import { toast } from "@/hooks/use-toast";
import { Plus, Edit, Trash2, Target, Calendar, Clock } from "lucide-react";
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
import { formatDate } from "@/utils/date-util";

interface MilestoneManagementProps {
  wbsId: number;
  /** マイルストーンと達成見込み（サーバー側で判定済み） */
  initialMilestones: MilestoneForecastDto[];
  phases: Array<{ id: number; name: string }>;
  tasks: Array<{ id: number; taskNo?: string; name: string }>;
}

const FORECAST_BADGE_CLASSES: Record<MilestoneForecastStatus, string> = {
  ACHIEVED: "bg-green-600 hover:bg-green-600",
  ON_TRACK: "bg-blue-500 hover:bg-blue-500",
  AT_RISK: "bg-yellow-500 hover:bg-yellow-500",
  OVERDUE: "bg-red-600 hover:bg-red-600",
  NO_FORECAST: "bg-gray-400 hover:bg-gray-400",
  NO_TARGET: "bg-gray-400 hover:bg-gray-400",
};

function delayText(days: number | null): string {
  if (days === null) return "";
  if (days > 0) return `${days}日遅れ`;
  if (days < 0) return `${-days}日前倒し`;
  return "予定どおり";
}

export default function MilestoneManagement({
  wbsId,
  initialMilestones,
  phases,
  tasks,
}: MilestoneManagementProps) {
  const [milestones, setMilestones] = useState<MilestoneForecastDto[]>(initialMilestones);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMilestone, setEditingMilestone] = useState<
    MilestoneForecastDto | undefined
  >();
  const [deleteConfirm, setDeleteConfirm] = useState<MilestoneForecastDto | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleCreateMilestone = () => {
    setEditingMilestone(undefined);
    setIsModalOpen(true);
  };

  const handleEditMilestone = (milestone: MilestoneForecastDto) => {
    setEditingMilestone(milestone);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingMilestone(undefined);
  };

  const handleMilestoneUpdate = () => {
    // データを再取得（簡易版：ページリロード）
    window.location.reload();
  };

  const handleDeleteClick = (milestone: MilestoneForecastDto) => {
    setDeleteConfirm(milestone);
  };

  const handleConfirmDelete = async () => {
    if (!deleteConfirm) return;

    setIsDeleting(true);
    try {
      const result = await deleteMilestone(deleteConfirm.id, wbsId);

      if (result.success) {
        toast({
          title: "マイルストーンを削除しました",
          description: `${deleteConfirm.name}を削除しました`,
        });
        // ローカル状態からも削除
        setMilestones((prev) => prev.filter((m) => m.id !== deleteConfirm.id));
      } else {
        toast({
          title: "削除エラー",
          description: result.error,
          variant: "destructive",
        });
      }
    } catch {
      toast({
        title: "エラー",
        description: "予期しないエラーが発生しました",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
      setDeleteConfirm(null);
    }
  };

  const getDaysFromNow = (date: Date | string) => {
    const localDate = typeof date === "string" ? new Date(date) : date;
    if (!localDate) return 0;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    localDate.setHours(0, 0, 0, 0);

    const diffTime = localDate.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  return (
    <div className="space-y-6">
      {/* ヘッダーアクション */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Target className="h-5 w-5 text-red-500" />
          <h2 className="text-xl font-semibold">マイルストーン一覧</h2>
          <Badge variant="outline">{milestones.length}件</Badge>
        </div>
        <Button
          onClick={handleCreateMilestone}
          className="flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          新規作成
        </Button>
      </div>

      {/* 統計カード */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              総マイルストーン数
            </CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{milestones.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">今月の予定</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {
                milestones.filter((m) => {
                  const days = getDaysFromNow(m.date);
                  return days >= 0 && days <= 30;
                }).length
              }
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">今週の予定</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {
                milestones.filter((m) => {
                  const days = getDaysFromNow(m.date);
                  return days >= 0 && days <= 7;
                }).length
              }
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              過去のマイルストーン
            </CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {milestones.filter((m) => getDaysFromNow(m.date) < 0).length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* マイルストーンテーブル */}
      <Card>
        <CardHeader>
          <CardTitle>マイルストーン詳細</CardTitle>
        </CardHeader>
        <CardContent>
          {milestones.length === 0 ? (
            <div className="text-center py-8">
              <Target className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                マイルストーンがありません
              </h3>
              <p className="text-gray-500 mb-4">
                新しいマイルストーンを作成して始めましょう
              </p>
              <Button onClick={handleCreateMilestone}>
                <Plus className="h-4 w-4 mr-2" />
                最初のマイルストーンを作成
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>マイルストーン名</TableHead>
                  <TableHead>日付</TableHead>
                  <TableHead>対象</TableHead>
                  <TableHead>達成見込み</TableHead>
                  <TableHead>残り日数</TableHead>
                  <TableHead className="w-20">アクション</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {milestones.map((milestone) => {
                  const daysFromNow = getDaysFromNow(milestone.date);
                  return (
                    <TableRow key={milestone.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <Target className="h-4 w-4 text-red-500" />
                          {milestone.name}
                        </div>
                      </TableCell>
                      <TableCell>
                        {formatDate(new Date(milestone.date), "YYYY/MM/DD")}
                      </TableCell>
                      <TableCell className="text-sm">
                        <div>
                          {milestone.targetType === "PHASE"
                            ? `フェーズ: ${
                                phases.find((phase) => phase.id === milestone.phaseId)?.name ??
                                "（削除済み）"
                              }`
                            : MILESTONE_TARGET_TYPE_LABELS[milestone.targetType]}
                        </div>
                        {milestone.targetType !== "EVENT" && (
                          <div className="text-xs text-gray-500">
                            {milestone.completedCount} / {milestone.totalCount} 完了
                          </div>
                        )}
                        {milestone.brokenLinkCount > 0 && (
                          <div className="text-xs text-red-600">
                            紐付け切れ {milestone.brokenLinkCount}件
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge className={FORECAST_BADGE_CLASSES[milestone.status]}>
                          {MILESTONE_FORECAST_STATUS_LABELS[milestone.status]}
                        </Badge>
                        <div className="text-xs text-gray-600 mt-1">
                          {milestone.status === "ACHIEVED" && milestone.achievedAt
                            ? `達成日 ${formatDate(new Date(milestone.achievedAt), "YYYY/MM/DD")}`
                            : milestone.forecastDate
                              ? `見込み ${formatDate(new Date(milestone.forecastDate), "YYYY/MM/DD")}`
                              : ""}
                        </div>
                        <div
                          className={`text-xs ${
                            (milestone.delayDays ?? 0) > 0 ? "text-red-600" : "text-gray-500"
                          }`}
                        >
                          {delayText(milestone.delayDays)}
                        </div>
                      </TableCell>
                      <TableCell>
                        {daysFromNow < 0 ? (
                          <span className="text-gray-500">
                            {Math.abs(daysFromNow)}日経過
                          </span>
                        ) : daysFromNow === 0 ? (
                          <span className="font-medium text-orange-600">
                            今日
                          </span>
                        ) : (
                          <span className="font-medium">
                            あと{daysFromNow}日
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditMilestone(milestone)}
                            className="h-8 w-8 p-0"
                            title="編集"
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteClick(milestone)}
                            className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
                            title="削除"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* マイルストーン編集モーダル */}
      <MilestoneModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        milestone={editingMilestone}
        wbsId={wbsId}
        phases={phases}
        tasks={tasks}
        onMilestoneUpdate={handleMilestoneUpdate}
      />

      {/* 削除確認ダイアログ */}
      <AlertDialog
        open={!!deleteConfirm}
        onOpenChange={() => setDeleteConfirm(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>マイルストーンを削除しますか？</AlertDialogTitle>
            <AlertDialogDescription>
              「{deleteConfirm?.name}」を削除します。この操作は取り消せません。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>
              キャンセル
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "削除中..." : "削除"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
