"use client";

import { useState } from "react";
import { WbsPhaseList } from "@/components/wbs/wbs-phase-list";
import { Button } from "@/components/ui/button";
import { PlusIcon } from "lucide-react";
import { updateTask, deleteTask } from "@/app/wbs/[id]/wbs-task-actions";
import { toast } from "@/hooks/use-toast";
import { WbsPhase, WbsTask } from "@/types/wbs";
import { NewTaskModal } from "@/components/wbs/new-task-modal";

type WbsManagementProps = {
  wbsId: number;
  initialPhases: WbsPhase[];
};

export function WbsManagement({ wbsId, initialPhases }: WbsManagementProps) {
  const [phases, setPhases] = useState(initialPhases);
  const [isNewTaskModalOpen, setIsNewTaskModalOpen] = useState(false);

  const handleTaskUpdate = async (
    taskId: string,
    updatedTask: Partial<WbsTask>
  ) => {
    try {
      const result = await updateTask(taskId, updatedTask);
      if (result.success) {
        setPhases((prevPhases) =>
          prevPhases.map((phase) => ({
            ...phase,
            tasks: phase.tasks.map((task) =>
              task.id === taskId ? { ...task, ...updatedTask } : task
            ),
          }))
        );
        toast({
          title: "タスクが更新されました",
          description: "タスクの情報が正常に更新されました。",
        });
      } else {
        throw new Error("Failed to update task");
      }
    } catch (error) {
      console.error("Failed to update task:", error);
      toast({
        title: "エラー",
        description: "タスクの更新に失敗しました。",
        variant: "destructive",
      });
    }
  };

  const handleTaskDelete = async (taskId: string) => {
    try {
      const result = await deleteTask(taskId);
      if (result.success) {
        setPhases((prevPhases) =>
          prevPhases.map((phase) => ({
            ...phase,
            tasks: phase.tasks.filter((task) => task.id !== taskId),
          }))
        );
        toast({
          title: "タスクが削除されました",
          description: "タスクが正常に削除されました。",
        });
      } else {
        throw new Error("Failed to delete task");
      }
    } catch (error) {
      console.error("Failed to delete task:", error);
      toast({
        title: "エラー",
        description: "タスクの削除に失敗しました。",
        variant: "destructive",
      });
    }
  };

  const handleNewTask = (newTask: WbsTask) => {
    setPhases((prevPhases) =>
      prevPhases.map((phase) =>
        phase.id === newTask.phaseId
          ? { ...phase, tasks: [...phase.tasks, newTask] }
          : phase
      )
    );
    setIsNewTaskModalOpen(false);
  };

  return (
    <div>
      <WbsPhaseList
        wbsId={wbsId}
        phases={phases}
        onTaskUpdate={handleTaskUpdate}
        onTaskDelete={handleTaskDelete}
      />
      <Button onClick={() => setIsNewTaskModalOpen(true)} className="mt-4">
        <PlusIcon className="mr-2 h-4 w-4" /> 新規タスク追加
      </Button>
      <NewTaskModal
        wbsId={wbsId}
        phases={phases}
        isOpen={isNewTaskModalOpen}
        onClose={() => setIsNewTaskModalOpen(false)}
        onTaskCreated={handleNewTask}
      />
    </div>
  );
}
