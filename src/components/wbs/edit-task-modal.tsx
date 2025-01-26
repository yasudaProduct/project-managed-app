"use client";

import { useState } from "react";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { WbsTask, TaskStatus } from "@/types/wbs";

type EditTaskModalProps = {
  task: WbsTask;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedTask: Partial<WbsTask>) => Promise<void>;
};

export function EditTaskModal({
  task,
  isOpen,
  onClose,
  onSave,
}: EditTaskModalProps) {
  const [name, setName] = useState(task.name);
  const [status, setStatus] = useState(task.status);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await onSave({ name, status });
      onClose();
    } catch (error) {
      console.error("Failed to update task:", error);
      // エラー処理を追加する（例：エラーメッセージの表示）
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>タスク編集</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">タスク名</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div>
            <Label htmlFor="status">ステータス</Label>
            <Select
              onValueChange={(value) => setStatus(value as TaskStatus)}
              defaultValue={status}
            >
              <SelectTrigger>
                <SelectValue placeholder="ステータスを選択" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="NOT_STARTED">未着手</SelectItem>
                <SelectItem value="IN_PROGRESS">進行中</SelectItem>
                <SelectItem value="COMPLETED">完了</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "更新中..." : "保存"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
