"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Target, Edit, Trash2 } from "lucide-react";
import { Milestone } from "@/types/wbs";
import { MilestoneModal } from "@/components/milestone/milestone-modal";
import { deleteMilestone } from "@/app/wbs/[id]/milestone-actions";
import { toast } from "@/hooks/use-toast";
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

interface MilestoneControlsProps {
  milestones: Milestone[];
  wbsId: number;
  onMilestoneUpdate: () => void;
}

export default function MilestoneControls({
  milestones,
  wbsId,
  onMilestoneUpdate,
}: MilestoneControlsProps) {
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
        onMilestoneUpdate();
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

  const formatDate = (date: Date | string) => {
    const d = typeof date === "string" ? new Date(date) : date;
    return d.toLocaleDateString("ja-JP", {
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div className="bg-white border rounded-lg p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium flex items-center gap-2">
          <Target className="h-4 w-4 text-red-500" />
          マイルストーン
        </h3>
        <Button
          size="sm"
          onClick={handleCreateMilestone}
          className="flex items-center gap-1"
        >
          <Plus className="h-3 w-3" />
          追加
        </Button>
      </div>

      {milestones.length === 0 ? (
        <p className="text-sm text-gray-500 text-center py-4">
          マイルストーンがありません
        </p>
      ) : (
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {milestones.map((milestone) => (
            <div
              key={milestone.id}
              className="flex items-center justify-between p-2 bg-gray-50 rounded text-sm"
            >
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <Target className="h-3 w-3 text-red-500 flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="font-medium truncate">{milestone.name}</p>
                  <p className="text-xs text-gray-500">
                    {formatDate(milestone.date)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 w-6 p-0"
                  onClick={() => handleEditMilestone(milestone)}
                  title="編集"
                >
                  <Edit className="h-3 w-3" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
                  onClick={() => handleDeleteClick(milestone)}
                  title="削除"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* マイルストーン編集モーダル */}
      <MilestoneModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        milestone={editingMilestone}
        wbsId={wbsId}
        onMilestoneUpdate={onMilestoneUpdate}
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
