"use client";

import type { WbsTask } from "@/types/wbs";
import { columns } from "./wbs-task-columns";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { EditTaskModal } from "@/components/wbs/edit-task-modal";

type WbsTaskListProps = {
  wbsId: number;
  phaseId: number;
  tasks: WbsTask[];
  onTaskUpdate: (
    taskId: string,
    updatedTask: Partial<WbsTask>
  ) => Promise<void>;
  onTaskDelete: (taskId: string) => Promise<void>;
};

export function WbsTaskList({
  wbsId,
  phaseId,
  tasks,
  onTaskUpdate,
  onTaskDelete,
}: WbsTaskListProps) {
  const [editingTask, setEditingTask] = useState<WbsTask | null>(null);

  const handleEditClick = (task: WbsTask) => {
    setEditingTask(task);
  };

  const handleEditClose = () => {
    setEditingTask(null);
  };

  const handleEditSave = async (updatedTask: Partial<WbsTask>) => {
    if (editingTask) {
      await onTaskUpdate(editingTask.id, updatedTask);
      setEditingTask(null);
    }
  };

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            {columns.map((column) => (
              <TableHead key={column.accessorKey}>{column.header}</TableHead>
            ))}
            <TableHead>アクション</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tasks.map((task) => (
            <TableRow key={task.id}>
              {columns.map((column) => (
                <TableCell key={column.accessorKey}>
                  {column.cell
                    ? column.cell({ row: { original: task } })
                    : task[column.accessorKey as keyof WbsTask]}
                </TableCell>
              ))}
              <TableCell>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleEditClick(task)}
                >
                  編集
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => onTaskDelete(task.id)}
                  className="ml-2"
                >
                  削除
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {editingTask && (
        <EditTaskModal
          task={editingTask}
          isOpen={!!editingTask}
          onClose={handleEditClose}
          onSave={handleEditSave}
        />
      )}
    </>
  );
}
