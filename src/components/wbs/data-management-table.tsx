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
import {
  createTask,
  deleteTask,
  updateTask,
} from "@/app/wbs/[id]/wbs-task-actions";
import { toast } from "@/hooks/use-toast";
import { formatDateyyyymmdd } from "@/lib/utils";
import { TaskStatus } from "@prisma/client";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { getUsers } from "@/app/users/user-actions";

export interface WbsTask {
  id: string;
  name: string;
  kijunStartDate: string;
  kijunEndDate: string;
  kijunKosu: number;
  yoteiStartDate: string;
  yoteiEndDate: string;
  yoteiKosu: number;
  jissekiStartDate: string;
  jissekiEndDate: string;
  jissekiKosu: number;
  status: TaskStatus;
  assigneeId: string;
  assignee?: {
    id: string;
    name: string;
    displayName: string;
  };
}

interface WbsManagementTableProps {
  wbsId: number;
  wbsTasks: WbsTask[];
}

export default function WbsManagementTable({
  wbsId,
  wbsTasks,
}: WbsManagementTableProps) {
  const [wbsIdState, setWbsIdState] = useState(wbsId);
  const [tasks, setData] = useState<WbsTask[]>(wbsTasks);
  const [editItem, setEditItem] = useState<WbsTask | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [assigneeList, setAssigneeList] = useState<
    { id: string; name: string }[]
  >([]);

  useEffect(() => {
    setWbsIdState(wbsId);
    setData(wbsTasks);

    // ユーザー情報を取得
    const fetchUsers = async () => {
      const result = await getUsers();
      if (result) {
        setAssigneeList(
          result.map((user: { id: string; name: string }) => ({
            id: user.id,
            name: user.name,
          }))
        );
      }
    };

    fetchUsers();
  }, [wbsId, wbsTasks]);

  const addItem = async (newTasks: WbsTask) => {
    try {
      const result = await createTask(wbsIdState, {
        id: newTasks.id,
        name: newTasks.name,
        kijunStartDate: newTasks.kijunStartDate,
        kijunEndDate: newTasks.kijunEndDate,
        kijunKosu: newTasks.kijunKosu,
        yoteiStartDate: newTasks.yoteiStartDate,
        yoteiEndDate: newTasks.yoteiEndDate,
        yoteiKosu: newTasks.yoteiKosu,
        jissekiStartDate: newTasks.jissekiStartDate,
        jissekiEndDate: newTasks.jissekiEndDate,
        jissekiKosu: newTasks.jissekiKosu,
        status: newTasks.status,
        assigneeId: newTasks.assigneeId,
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
        variant: "destructive",
      });
    }
  };

  const startEditing = (id: string) => {
    const item = tasks.find((item) => item.id === id);
    if (item) {
      setEditItem(item);
      setEditingId(id);
    }
  };

  const saveEdit = async (id: string) => {
    try {
      const result = await updateTask(id, {
        id: editItem!.id,
        name: editItem!.name,
        kijunStartDate: editItem!.kijunStartDate,
        kijunEndDate: editItem!.kijunEndDate,
        kijunKosu: editItem!.kijunKosu,
        yoteiStartDate: editItem!.yoteiStartDate,
        yoteiEndDate: editItem!.yoteiEndDate,
        yoteiKosu: editItem!.yoteiKosu,
        jissekiStartDate: editItem!.jissekiStartDate,
        jissekiEndDate: editItem!.jissekiEndDate,
        jissekiKosu: editItem!.jissekiKosu,
        status: editItem!.status,
        assigneeId: editItem!.assigneeId,
      });

      if (result.success) {
        toast({
          title: "タスクを更新しました",
          description: "タスクが更新されました",
        });
      } else {
        toast({
          title: "タスクの更新に失敗しました",
          description: result.error,
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "タスクの更新に失敗しました",
        description: error instanceof Error ? error.message : "不明なエラー",
        variant: "destructive",
      });
    } finally {
      setEditingId(null);
      setEditItem(null);
    }
  };

  const deleteItem = async (id: string) => {
    try {
      const result = await deleteTask(id);
      if (result.success) {
        toast({
          title: "タスクを削除しました",
          description: "タスクが削除されました",
        });
      } else {
        toast({
          title: "タスクの削除に失敗しました",
          description: result.error,
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "タスクの削除に失敗しました",
        description: error instanceof Error ? error.message : "不明なエラー",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="container mx-auto p-4">
      <div className="mb-4 flex gap-2">
        <AddTaskModal
          onAddItem={addItem}
          wbsId={wbsId}
          assigneeList={assigneeList}
        />
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>WBSID</TableHead>
            <TableHead>タスク名</TableHead>
            <TableHead>担当者</TableHead>
            <TableHead>基準開始日</TableHead>
            <TableHead>基準終了日</TableHead>
            <TableHead>基準工数</TableHead>
            <TableHead>予定開始日</TableHead>
            <TableHead>予定終了日</TableHead>
            <TableHead>予定工数</TableHead>
            <TableHead>実績開始日</TableHead>
            <TableHead>実績終了日</TableHead>
            <TableHead>実績工数</TableHead>
            <TableHead>ステータス</TableHead>
            <TableHead>操作</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tasks.map((item) => (
            <TableRow key={item.id}>
              <TableCell>
                {editingId === item.id && editItem ? (
                  <Input
                    value={editItem.id || item.id}
                    onChange={(e) =>
                      setEditItem({ ...editItem, id: e.target.value })
                    }
                  />
                ) : (
                  item.id
                )}
              </TableCell>
              <TableCell>
                {editingId === item.id && editItem ? (
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
                {editingId === item.id && editItem ? (
                  <Select
                    defaultValue={item.assigneeId}
                    onValueChange={(value) =>
                      setEditItem({ ...editItem, assigneeId: value })
                    }
                  >
                    <SelectTrigger className="col-span-3">
                      <SelectValue placeholder="担当者を選択" />
                    </SelectTrigger>
                    <SelectContent>
                      {assigneeList.length > 0 ? (
                        assigneeList.map((user) => (
                          <SelectItem key={user.id} value={user.id}>
                            {user.name}
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value="loading" disabled>
                          読み込み中...
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                ) : (
                  item.assignee?.displayName || ""
                )}
              </TableCell>
              <TableCell>
                {editingId === item.id && editItem ? (
                  <Input
                    type="date"
                    value={editItem.kijunStartDate || item.kijunStartDate}
                    onChange={(e) =>
                      setEditItem({
                        ...editItem,
                        kijunStartDate: e.target.value,
                      })
                    }
                  />
                ) : (
                  formatDateyyyymmdd(item.kijunStartDate)
                )}
              </TableCell>
              <TableCell>
                {editingId === item.id && editItem ? (
                  <Input
                    type="date"
                    value={editItem.kijunEndDate || item.kijunEndDate}
                    onChange={(e) =>
                      setEditItem({ ...editItem, kijunEndDate: e.target.value })
                    }
                  />
                ) : (
                  formatDateyyyymmdd(item.kijunEndDate)
                )}
              </TableCell>
              <TableCell>
                {editingId === item.id && editItem ? (
                  <Input
                    type="number"
                    value={editItem.kijunKosu || item.kijunKosu}
                    onChange={(e) =>
                      setEditItem({
                        ...editItem,
                        kijunKosu: Number(e.target.value),
                      })
                    }
                  />
                ) : (
                  item.kijunKosu || 0
                )}
              </TableCell>

              <TableCell>
                {editingId === item.id && editItem ? (
                  <Input
                    type="date"
                    value={editItem.yoteiStartDate || item.yoteiStartDate}
                    onChange={(e) =>
                      setEditItem({
                        ...editItem,
                        yoteiStartDate: e.target.value,
                      })
                    }
                  />
                ) : (
                  formatDateyyyymmdd(item.yoteiStartDate)
                )}
              </TableCell>
              <TableCell>
                {editingId === item.id && editItem ? (
                  <Input
                    type="date"
                    value={editItem.yoteiEndDate || item.yoteiEndDate}
                    onChange={(e) =>
                      setEditItem({ ...editItem, yoteiEndDate: e.target.value })
                    }
                  />
                ) : (
                  formatDateyyyymmdd(item.yoteiEndDate)
                )}
              </TableCell>
              <TableCell>
                {editingId === item.id && editItem ? (
                  <Input
                    type="number"
                    value={editItem.yoteiKosu || item.yoteiKosu}
                    onChange={(e) =>
                      setEditItem({
                        ...editItem,
                        yoteiKosu: Number(e.target.value),
                      })
                    }
                  />
                ) : (
                  item.yoteiKosu || 0
                )}
              </TableCell>

              <TableCell>
                {editingId === item.id && editItem ? (
                  <Input
                    type="date"
                    value={editItem.jissekiStartDate || item.jissekiStartDate}
                    onChange={(e) =>
                      setEditItem({
                        ...editItem,
                        jissekiStartDate: e.target.value,
                      })
                    }
                  />
                ) : (
                  formatDateyyyymmdd(item.jissekiStartDate)
                )}
              </TableCell>
              <TableCell>
                {editingId === item.id && editItem ? (
                  <Input
                    type="date"
                    value={editItem.jissekiEndDate || item.jissekiEndDate}
                    onChange={(e) =>
                      setEditItem({
                        ...editItem,
                        jissekiEndDate: e.target.value,
                      })
                    }
                  />
                ) : (
                  formatDateyyyymmdd(item.jissekiEndDate)
                )}
              </TableCell>
              <TableCell>
                {editingId === item.id && editItem ? (
                  <Input
                    type="number"
                    value={editItem.jissekiKosu || item.jissekiKosu}
                    onChange={(e) =>
                      setEditItem({
                        ...editItem,
                        jissekiKosu: Number(e.target.value),
                      })
                    }
                  />
                ) : (
                  item.jissekiKosu || 0
                )}
              </TableCell>
              <TableCell>
                {editingId === item.id && editItem ? (
                  <Select
                    defaultValue={item.status}
                    onValueChange={(value) =>
                      setEditItem({ ...editItem, status: value as TaskStatus })
                    }
                  >
                    <SelectTrigger className="col-span-3">
                      <SelectValue placeholder="ステータスを選択" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem key="NOT_STARTED" value="NOT_STARTED">
                        未着手
                      </SelectItem>
                      <SelectItem key="IN_PROGRESS" value="IN_PROGRESS">
                        進行中
                      </SelectItem>
                      <SelectItem key="COMPLETED" value="COMPLETED">
                        完了
                      </SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  item.status
                )}
              </TableCell>

              {/* {ボタン} */}
              <TableCell>
                {editingId === item.id ? (
                  <>
                    <Button onClick={() => saveEdit(item.id)}>保存</Button>
                    <Button
                      variant="secondary"
                      onClick={() => setEditingId(null)}
                    >
                      キャンセル
                    </Button>
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
