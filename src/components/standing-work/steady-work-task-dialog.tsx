"use client";

import { useEffect, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { createSteadyWorkTask } from "@/app/wbs/[id]/actions/steady-work-plan-actions";
import { toast } from "@/hooks/use-toast";

const UNASSIGNED = "unassigned";

const formSchema = z.object({
  name: z.string().trim().min(1, "タスク名を入力してください").max(100, "タスク名は100文字以内で入力してください"),
  assigneeId: z.string(),
});

type SteadyWorkTaskFormValues = z.infer<typeof formSchema>;

interface SteadyWorkTaskDialogProps {
  wbsId: number;
  assignees: Array<{ id: number; displayName: string }>;
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
}

/** 常設プロジェクトに期間なしの定常タスクを追加する（名前と担当者のみ） */
export function SteadyWorkTaskDialog({ wbsId, assignees, isOpen, onClose, onSaved }: SteadyWorkTaskDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const form = useForm<SteadyWorkTaskFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { name: "", assigneeId: UNASSIGNED },
  });

  useEffect(() => {
    if (isOpen) form.reset({ name: "", assigneeId: UNASSIGNED });
  }, [isOpen, form]);

  const onSubmit = async (values: SteadyWorkTaskFormValues) => {
    setIsSubmitting(true);
    try {
      const result = await createSteadyWorkTask({
        wbsId,
        name: values.name.trim(),
        assigneeId: values.assigneeId === UNASSIGNED ? undefined : Number(values.assigneeId),
      });
      if (result.success) {
        toast({ title: "定常タスクを追加しました" });
        onClose();
        onSaved();
      } else {
        toast({ title: "エラー", description: result.error, variant: "destructive" });
      }
    } catch {
      toast({ title: "エラー", description: "予期しないエラーが発生しました", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>定常タスクを追加</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>タスク名</FormLabel>
                  <FormControl>
                    <Input placeholder="例: 保守対応、社内雑務" {...field} />
                  </FormControl>
                  <FormDescription>予定期間・工数は持たず、定常枠で負荷を表します</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="assigneeId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>担当者</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="担当者を選択" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value={UNASSIGNED}>未割当</SelectItem>
                      {assignees.map((assignee) => (
                        <SelectItem key={assignee.id} value={String(assignee.id)}>
                          {assignee.displayName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>定常枠を付けるには担当者が必要です</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
                キャンセル
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "追加中..." : "追加"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
