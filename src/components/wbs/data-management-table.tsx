"use client";

import { useEffect, useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Pencil, Trash2 } from "lucide-react";
import { AddTaskModal } from "./add-task-modal";
import { createTask } from "@/app/wbs/[id]/wbs-task-actions";
import { toast } from "@/hooks/use-toast";

export interface WbsTasks {
  id: string;
  name: string;
  kijunStartDate: string;
  kijunEndDate: string;
  kijunKosu: number;
  // assigneeId: string | null;
  // assignee?: {
  //   id: string;
  //   name: string;
  // };
}

interface WbsManagementTableProps {
  wbsId: number;
  wbsTasks: WbsTasks[];
}

export default function WbsManagementTable({
  wbsId,
  wbsTasks,
}: WbsManagementTableProps) {
  const [wbsIdState, setWbsIdState] = useState(wbsId);
  const [tasks, setData] = useState<WbsTasks[]>(wbsTasks);
  const [editItem, setEditItem] = useState({ name: "" });
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    setWbsIdState(wbsId);
    setData(wbsTasks);
  }, [wbsId, wbsTasks]);

  const addItem = async (newTasks: WbsTasks) => {
    try {
      const result = await createTask(wbsIdState, {
        id: newTasks.id,
        name: newTasks.name,
        kijunStartDate: newTasks.kijunStartDate,
        kijunEndDate: newTasks.kijunEndDate,
        kijunKosu: newTasks.kijunKosu,
      });
      if (result.success) {
        toast({
          title: "タスクを追加しました",
          description: "タスクが追加されました",
        });
      }
    } catch (error) {
      toast({
        title: "タスクの追加に失敗しました",
        description: error instanceof Error ? error.message : "不明なエラー",
      });
    }
  };

  const startEditing = (id: string) => {
    const item = tasks.find((item) => item.id === id);
    if (item) {
      setEditItem({ name: item.name });
      setEditingId(id);
    }
  };

  const saveEdit = (id: string) => {
    setData(
      tasks.map((item) => (item.id === id ? { ...item, ...editItem } : item))
    );
    setEditingId(null);
    setEditItem({ name: "" });
  };

  const deleteItem = (id: string) => {
    setData(tasks.filter((item) => item.id !== id));
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">データ管理テーブル</h1>

      <div className="mb-4 flex gap-2">
        <AddTaskModal onAddItem={addItem} wbsId={wbsId} />
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>タスク名</TableHead>
            <TableHead>操作</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tasks.map((item) => (
            <TableRow key={item.id}>
              <TableCell>
                {editingId === item.id ? (
                  <Input
                    value={editItem.name || item.name}
                    onChange={(e) =>
                      setEditItem({ ...editItem, name: e.target.value })
                    }
                  />
                ) : (
                  item.name
                )}
              </TableCell>
              <TableCell>
                {editingId === item.id ? (
                  <>
                    <Button onClick={() => saveEdit(item.id)}>保存</Button>
                    <Button variant="secondary" onClick={() => setEditingId(null)}>キャンセル</Button>
                  </>
                ) : (
                  <Button variant="ghost" onClick={() => startEditing(item.id)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                )}
                <Button variant="ghost" onClick={() => deleteItem(item.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
