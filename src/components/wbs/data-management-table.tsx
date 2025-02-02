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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { formatDateyyyymmdd, getTaskStatusName } from "@/lib/utils";
import { TaskStatus } from "@prisma/client";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { getWbsPhases } from "@/app/wbs/[id]/wbs-phase-actions";
import Link from "next/link";
import { getWbsAssignees } from "@/app/wbs/assignee/assignee-actions";
import { WbsTask } from "@/types/wbs";

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
  const [phases, setPhases] = useState<
    {
      id: number;
      name: string;
      seq: number;
    }[]
  >([]);
  useEffect(() => {
    setWbsIdState(wbsId);
    setData(wbsTasks);

    // ユーザー情報を取得
    const fetchUsers = async () => {
      const result = await getWbsAssignees(wbsIdState);
      if (result) {
        setAssigneeList(
          result.map((user: { assignee: { id: string; name: string } }) => ({
            id: user.assignee.id,
            name: user.assignee.name,
          }))
        );
      }
    };

    // フェーズ情報を取得
    const fetchPhases = async () => {
      const result = await getWbsPhases(wbsIdState);
      if (result) {
        setPhases(result);
      }
    };

    fetchUsers();
    fetchPhases();
  }, [wbsId, wbsTasks]);

  const addItem = async (newTasks: WbsTask) => {
    try {
      const result = await createTask(wbsIdState, {
        id: newTasks.id,
        name: newTasks.name,
        periods: newTasks.periods?.map((period) => ({
          startDate: period.startDate.toISOString(),
          endDate: period.endDate.toISOString(),
          type: period.type,
          kosus: period.kosus.map((kosu) => ({
            kosu: kosu.kosu,
            type: kosu.type,
          })),
        })),
        status: newTasks.status,
        assigneeId: newTasks.assigneeId,
        phaseId: newTasks.phaseId,
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
        periods: editItem!.periods?.map((period) => ({
          startDate: period.startDate.toISOString(),
          endDate: period.endDate.toISOString(),
          type: period.type,
          kosus: period.kosus.map((kosu) => ({
            kosu: kosu.kosu,
            type: kosu.type,
          })),
        })),
        status: editItem!.status,
        assigneeId: editItem!.assigneeId,
        phaseId: editItem!.phaseId,
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

  const updateItem = async (id: string, item: WbsTask) => {
    try {
      const result = await updateTask(id, {
        id: item!.id,
        name: item!.name,
        periods: item!.periods?.map((period) => ({
          startDate: period.startDate.toISOString(),
          endDate: period.endDate.toISOString(),
          type: period.type,
          kosus: period.kosus.map((kosu) => ({
            kosu: kosu.kosu,
            type: kosu.type,
          })),
        })),
        status: item!.status,
        assigneeId: item!.assigneeId,
        phaseId: item!.phaseId,
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
          phases={phases}
        />
        <Link href={`/wbs/${wbsId}/phase/new`}>
          <Button>フェーズ追加</Button>
        </Link>
        <Link href={`/wbs/${wbsId}/assignee/new`}>
          <Button>担当者追加</Button>
        </Link>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>フェーズ名</TableHead>
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
                  <Select
                    defaultValue={item.phaseId?.toString()}
                    onValueChange={(value) =>
                      setEditItem({ ...editItem, phaseId: Number(value) })
                    }
                  >
                    <SelectTrigger className="col-span-3">
                      <SelectValue placeholder="フェーズを選択" />
                    </SelectTrigger>
                    <SelectContent>
                      {phases.length > 0 ? (
                        phases.map((phase) => (
                          <SelectItem
                            key={phase.id}
                            value={phase.id.toString()}
                          >
                            {phase.name}
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
                  item.phase?.name || ""
                )}
              </TableCell>
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
                    value={
                      editItem.periods
                        ?.find((period) => period.type === "KIJUN")
                        ?.startDate?.toISOString() ||
                      item.periods
                        ?.find((period) => period.type === "KIJUN")
                        ?.startDate?.toISOString()
                    }
                    onChange={(e) =>
                      setEditItem({
                        ...editItem,
                        periods: editItem.periods?.map((period) =>
                          period.type === "KIJUN"
                            ? { ...period, startDate: new Date(e.target.value) }
                            : period
                        ),
                      })
                    }
                  />
                ) : (
                  formatDateyyyymmdd(
                    item.periods
                      ?.find((period) => period.type === "KIJUN")
                      ?.startDate?.toISOString() || new Date().toISOString()
                  )
                )}
              </TableCell>
              <TableCell>
                {editingId === item.id && editItem ? (
                  <Input
                    type="date"
                    value={
                      editItem.periods
                        ?.find((period) => period.type === "KIJUN")
                        ?.endDate?.toISOString() ||
                      item.periods
                        ?.find((period) => period.type === "KIJUN")
                        ?.endDate?.toISOString()
                    }
                    onChange={(e) =>
                      setEditItem({
                        ...editItem,
                        periods: editItem.periods?.map((period) =>
                          period.type === "KIJUN"
                            ? { ...period, endDate: new Date(e.target.value) }
                            : period
                        ),
                      })
                    }
                  />
                ) : (
                  formatDateyyyymmdd(
                    item.periods
                      ?.find((period) => period.type === "KIJUN")
                      ?.endDate?.toISOString() || new Date().toISOString()
                  )
                )}
              </TableCell>
              <TableCell>
                {editingId === item.id && editItem ? (
                  <Input
                    type="number"
                    value={
                      editItem.periods
                        ?.find((period) => period.type === "KIJUN")
                        ?.kosus.find((kosu) => kosu.type === "NORMAL")?.kosu ||
                      item.periods
                        ?.find((period) => period.type === "KIJUN")
                        ?.kosus.find((kosu) => kosu.type === "NORMAL")?.kosu
                    }
                    onChange={(e) =>
                      setEditItem({
                        ...editItem,
                        periods: editItem.periods?.map((period) =>
                          period.type === "KIJUN"
                            ? {
                                ...period,
                                kosus: period.kosus.map((kosu) =>
                                  kosu.type === "NORMAL"
                                    ? { ...kosu, kosu: Number(e.target.value) }
                                    : kosu
                                ),
                              }
                            : period
                        ),
                      })
                    }
                  />
                ) : (
                  item.periods
                    ?.find((period) => period.type === "KIJUN")
                    ?.kosus.find((kosu) => kosu.type === "NORMAL")?.kosu || 0
                )}
              </TableCell>

              <TableCell>
                {editingId === item.id && editItem ? (
                  <Input
                    type="date"
                    value={
                      editItem.periods
                        ?.find((period) => period.type === "YOTEI")
                        ?.startDate?.toISOString() ||
                      item.periods
                        ?.find((period) => period.type === "YOTEI")
                        ?.startDate?.toISOString()
                    }
                    onChange={(e) =>
                      setEditItem({
                        ...editItem,
                        periods: editItem.periods?.map((period) =>
                          period.type === "YOTEI"
                            ? { ...period, startDate: new Date(e.target.value) }
                            : period
                        ),
                      })
                    }
                  />
                ) : (
                  formatDateyyyymmdd(
                    item.periods
                      ?.find((period) => period.type === "YOTEI")
                      ?.startDate?.toISOString() || new Date().toISOString()
                  )
                )}
              </TableCell>
              <TableCell>
                {editingId === item.id && editItem ? (
                  <Input
                    type="date"
                    value={
                      editItem.periods
                        ?.find((period) => period.type === "YOTEI")
                        ?.endDate?.toISOString() ||
                      item.periods
                        ?.find((period) => period.type === "YOTEI")
                        ?.endDate?.toISOString()
                    }
                    onChange={(e) =>
                      setEditItem({
                        ...editItem,
                        periods: editItem.periods?.map((period) =>
                          period.type === "YOTEI"
                            ? { ...period, endDate: new Date(e.target.value) }
                            : period
                        ),
                      })
                    }
                  />
                ) : (
                  formatDateyyyymmdd(
                    item.periods
                      ?.find((period) => period.type === "YOTEI")
                      ?.endDate?.toISOString() || new Date().toISOString()
                  )
                )}
              </TableCell>
              <TableCell>
                {editingId === item.id && editItem ? (
                  <Input
                    type="number"
                    value={
                      editItem.periods
                        ?.find((period) => period.type === "YOTEI")
                        ?.kosus.find((kosu) => kosu.type === "NORMAL")?.kosu ||
                      item.periods
                        ?.find((period) => period.type === "YOTEI")
                        ?.kosus.find((kosu) => kosu.type === "NORMAL")?.kosu
                    }
                    onChange={(e) =>
                      setEditItem({
                        ...editItem,
                        periods: editItem.periods?.map((period) =>
                          period.type === "YOTEI"
                            ? {
                                ...period,
                                kosus: period.kosus.map((kosu) =>
                                  kosu.type === "NORMAL"
                                    ? { ...kosu, kosu: Number(e.target.value) }
                                    : kosu
                                ),
                              }
                            : period
                        ),
                      })
                    }
                  />
                ) : (
                  item.periods
                    ?.find((period) => period.type === "YOTEI")
                    ?.kosus.find((kosu) => kosu.type === "NORMAL")?.kosu || 0
                )}
              </TableCell>

              <TableCell>
                {editingId === item.id && editItem ? (
                  <Input
                    type="date"
                    value={
                      editItem.periods
                        ?.find((period) => period.type === "JISSEKI")
                        ?.startDate?.toISOString() ||
                      item.periods
                        ?.find((period) => period.type === "JISSEKI")
                        ?.startDate?.toISOString()
                    }
                    onChange={(e) =>
                      setEditItem({
                        ...editItem,
                        periods: editItem.periods?.map((period) =>
                          period.type === "JISSEKI"
                            ? { ...period, startDate: new Date(e.target.value) }
                            : period
                        ),
                      })
                    }
                  />
                ) : (
                  formatDateyyyymmdd(
                    item.periods
                      ?.find((period) => period.type === "JISSEKI")
                      ?.startDate?.toISOString() || new Date().toISOString()
                  )
                )}
              </TableCell>
              <TableCell>
                {editingId === item.id && editItem ? (
                  <Input
                    type="date"
                    value={
                      editItem.periods
                        ?.find((period) => period.type === "JISSEKI")
                        ?.endDate?.toISOString() ||
                      item.periods
                        ?.find((period) => period.type === "JISSEKI")
                        ?.endDate?.toISOString()
                    }
                    onChange={(e) =>
                      setEditItem({
                        ...editItem,
                        periods: editItem.periods?.map((period) =>
                          period.type === "JISSEKI"
                            ? { ...period, endDate: new Date(e.target.value) }
                            : period
                        ),
                      })
                    }
                  />
                ) : (
                  formatDateyyyymmdd(
                    item.periods
                      ?.find((period) => period.type === "JISSEKI")
                      ?.endDate?.toISOString() || new Date().toISOString()
                  )
                )}
              </TableCell>
              <TableCell>
                {editingId === item.id && editItem ? (
                  <Input
                    type="number"
                    value={
                      editItem.periods
                        ?.find((period) => period.type === "JISSEKI")
                        ?.kosus.find((kosu) => kosu.type === "NORMAL")?.kosu ||
                      item.periods
                        ?.find((period) => period.type === "JISSEKI")
                        ?.kosus.find((kosu) => kosu.type === "NORMAL")?.kosu
                    }
                    onChange={(e) =>
                      setEditItem({
                        ...editItem,
                        periods: editItem.periods?.map((period) =>
                          period.type === "JISSEKI"
                            ? {
                                ...period,
                                kosus: period.kosus.map((kosu) =>
                                  kosu.type === "NORMAL"
                                    ? { ...kosu, kosu: Number(e.target.value) }
                                    : kosu
                                ),
                              }
                            : period
                        ),
                      })
                    }
                  />
                ) : (
                  item.periods
                    ?.find((period) => period.type === "JISSEKI")
                    ?.kosus.find((kosu) => kosu.type === "NORMAL")?.kosu || 0
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
                        {getTaskStatusName("NOT_STARTED")}
                      </SelectItem>
                      <SelectItem key="IN_PROGRESS" value="IN_PROGRESS">
                        {getTaskStatusName("IN_PROGRESS")}
                      </SelectItem>
                      <SelectItem key="COMPLETED" value="COMPLETED">
                        {getTaskStatusName("COMPLETED")}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  getTaskStatusName(item.status)
                )}
              </TableCell>

              {/* {ボタン} */}
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger>
                    <Button variant="ghost">...</Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    {editingId === item.id ? (
                      <>
                        <DropdownMenuItem onClick={() => saveEdit(item.id)}>
                          保存
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setEditingId(null)}>
                          キャンセル
                        </DropdownMenuItem>
                      </>
                    ) : (
                      <DropdownMenuItem onClick={() => startEditing(item.id)}>
                        <Pencil className="h-4 w-4" /> 編集
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem onClick={() => deleteItem(item.id)}>
                      <Trash2 className="h-4 w-4" /> 削除
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
