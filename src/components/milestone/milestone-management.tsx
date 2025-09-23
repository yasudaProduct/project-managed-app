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
import { Milestone } from "@/types/wbs";
import { MilestoneModal } from "./milestone-modal";
import { deleteMilestone } from "@/app/wbs/[id]/milestone-actions";
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
import { formatDate } from "@/lib/date-util";

interface MilestoneManagementProps {
  wbsId: number;
  initialMilestones: Milestone[];
}

export default function MilestoneManagement({
  wbsId,
  initialMilestones,
}: MilestoneManagementProps) {
  const [milestones, setMilestones] = useState<Milestone[]>(initialMilestones);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMilestone, setEditingMilestone] = useState<
    Milestone | undefined
  >();
  const [deleteConfirm, setDeleteConfirm] = useState<Milestone | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleCreateMilestone = () => {
    setEditingMilestone(undefined);
    setIsModalOpen(true);
  };

  const handleEditMilestone = (milestone: Milestone) => {
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

  const handleDeleteClick = (milestone: Milestone) => {
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

  const getStatusBadge = (daysFromNow: number) => {
    if (daysFromNow < 0) {
      return <Badge variant="secondary">過去</Badge>;
    } else if (daysFromNow === 0) {
      return <Badge className="bg-orange-500 hover:bg-orange-600">今日</Badge>;
    } else if (daysFromNow <= 7) {
      return <Badge className="bg-red-500 hover:bg-red-600">近日</Badge>;
    } else if (daysFromNow <= 30) {
      return <Badge className="bg-yellow-500 hover:bg-yellow-600">今月</Badge>;
    } else {
      return <Badge className="bg-blue-500 hover:bg-blue-600">予定</Badge>;
    }
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
                  <TableHead>ステータス</TableHead>
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
                        {formatDate(milestone.date, "YYYY/MM/DD")}
                      </TableCell>
                      <TableCell>{getStatusBadge(daysFromNow)}</TableCell>
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
