"use client";

import { useState, useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
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
} from "@/app/wbs/[id]/actions/milestone-actions";
import { toast } from "@/hooks/use-toast";
import { Trash2, Calendar } from "lucide-react";

const formSchema = z.object({
  name: z.string().min(1, "マイルストーン名を入力してください"),
  date: z.string().min(1, "日付を入力してください"),
});

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
  const [isLoading, setIsLoading] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const isEditing = Boolean(milestone?.id);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { name: "", date: "" },
  });

  // モーダルが開かれた時にフィールドを初期化
  useEffect(() => {
    if (isOpen) {
      if (milestone) {
        form.reset({
          name: milestone.name,
          // UTC日付をローカル日付に変換してフォーマット
          date: milestone.date
            ? milestone.date.toISOString().split("T")[0]
            : "",
        });
      } else {
        form.reset({ name: "", date: "" });
      }
    }
  }, [isOpen, milestone, form]);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsLoading(true);

    try {
      const milestoneData = {
        name: values.name.trim(),
        date: new Date(values.date),
        wbsId,
      };

      const result =
        isEditing && milestone
          ? await updateMilestone({ ...milestoneData, id: milestone.id })
          : await createMilestone(milestoneData);

      if (result.success) {
        toast({
          title: isEditing
            ? "マイルストーンを更新しました"
            : "マイルストーンを作成しました",
          description: `${values.name}を${isEditing ? "更新" : "作成"}しました`,
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

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>マイルストーン名</FormLabel>
                    <FormControl>
                      <Input placeholder="マイルストーン名を入力" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>日付</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

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
                  <Button type="submit" disabled={isLoading}>
                    {isLoading ? "保存中..." : isEditing ? "更新" : "作成"}
                  </Button>
                </div>
              </div>
            </form>
          </Form>
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
