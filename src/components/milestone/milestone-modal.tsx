"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Milestone } from "@/types/wbs";
import {
  createMilestone,
  updateMilestone,
  deleteMilestone,
} from "@/app/wbs/[id]/milestone-actions";
import { toast } from "@/hooks/use-toast";
import { Trash2, Calendar } from "lucide-react";
import { utcToLocalDate } from "@/lib/date-display-utils";
import { ensureUTC } from "@/lib/date-utils-utc";

interface MilestoneModalProps {
  isOpen: boolean;
  onClose: () => void;
  milestone?: Milestone;
  wbsId: number;
  onMilestoneUpdate?: () => void;
}

export function MilestoneModal({
  isOpen,
  onClose,
  milestone,
  wbsId,
  onMilestoneUpdate,
}: MilestoneModalProps) {
  const [name, setName] = useState("");
  const [date, setDate] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const isEditing = Boolean(milestone?.id);

  // モーダルが開かれた時にフィールドを初期化
  useEffect(() => {
    if (isOpen) {
      if (milestone) {
        setName(milestone.name);
        // UTC日付をローカル日付に変換してフォーマット
        const localDate = utcToLocalDate(milestone.date);
        if (localDate) {
          setDate(localDate.toISOString().split("T")[0]);
        }
      } else {
        setName("");
        setDate("");
      }
    }
  }, [isOpen, milestone]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !date) return;

    setIsLoading(true);

    try {
      // ローカル日付をUTCに変換
      const localDateObj = new Date(date + "T00:00:00");
      const utcDate = ensureUTC(localDateObj);

      const milestoneData = {
        name: name.trim(),
        date: utcDate!,
        wbsId,
      };

      let result;
      if (isEditing && milestone) {
        result = await updateMilestone({
          ...milestoneData,
          id: milestone.id,
        });
      } else {
        result = await createMilestone(milestoneData);
      }

      if (result.success) {
        toast({
          title: isEditing
            ? "マイルストーンを更新しました"
            : "マイルストーンを作成しました",
          description: `${name}を${isEditing ? "更新" : "作成"}しました`,
        });
        onClose();
        if (onMilestoneUpdate) {
          onMilestoneUpdate();
        }
      } else {
        toast({
          title: "エラー",
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
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!milestone?.id) return;

    setIsLoading(true);
    try {
      const result = await deleteMilestone(milestone.id, wbsId);

      if (result.success) {
        toast({
          title: "マイルストーンを削除しました",
          description: `${milestone.name}を削除しました`,
        });
        onClose();
        if (onMilestoneUpdate) {
          onMilestoneUpdate();
        }
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
      setIsLoading(false);
      setShowDeleteDialog(false);
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              {isEditing ? "マイルストーンを編集" : "新しいマイルストーン"}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="milestone-name">マイルストーン名</Label>
              <Input
                id="milestone-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="マイルストーン名を入力"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="milestone-date">日付</Label>
              <Input
                id="milestone-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </div>

            <div className="flex justify-between pt-4">
              <div>
                {isEditing && (
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    onClick={() => setShowDeleteDialog(true)}
                    disabled={isLoading}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    削除
                  </Button>
                )}
              </div>

              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  disabled={isLoading}
                >
                  キャンセル
                </Button>
                <Button
                  type="submit"
                  disabled={isLoading || !name.trim() || !date}
                >
                  {isLoading ? "保存中..." : isEditing ? "更新" : "作成"}
                </Button>
              </div>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* 削除確認ダイアログ */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>マイルストーンを削除しますか？</AlertDialogTitle>
            <AlertDialogDescription>
              「{milestone?.name}」を削除します。この操作は取り消せません。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLoading}>
              キャンセル
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isLoading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isLoading ? "削除中..." : "削除"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
