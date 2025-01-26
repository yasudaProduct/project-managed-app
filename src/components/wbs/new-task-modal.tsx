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
import type { WbsPhase, WbsTask } from "@/types/wbs";
import { createTask } from "@/app/wbs/[id]/wbs-task-actions";

type NewTaskModalProps = {
  wbsId: number;
  phases: WbsPhase[];
  isOpen: boolean;
  onClose: () => void;
  onTaskCreated: (task: WbsTask) => void;
};

export function NewTaskModal({
  wbsId,
  phases,
  isOpen,
  onClose,
  onTaskCreated,
}: NewTaskModalProps) {
  const [name, setName] = useState("");
  const [phaseId, setPhaseId] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !phaseId) return;

    setIsSubmitting(true);
    try {
      const result = await createTask(wbsId, { name, phaseId });
      if (result.success && result.task) {
        onTaskCreated(result.task);
        setName("");
        setPhaseId(null);
      } else {
        throw new Error("Failed to create task");
      }
    } catch (error) {
      console.error("Failed to create task:", error);
      // エラー処理を追加する（例：エラーメッセージの表示）
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>新規タスク作成</DialogTitle>
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
            <Label htmlFor="phase">フェーズ</Label>
            <Select onValueChange={(value) => setPhaseId(Number(value))}>
              <SelectTrigger>
                <SelectValue placeholder="フェーズを選択" />
              </SelectTrigger>
              <SelectContent>
                {phases.map((phase) => (
                  <SelectItem key={phase.id} value={phase.id.toString()}>
                    {phase.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "作成中..." : "タスクを作成"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
