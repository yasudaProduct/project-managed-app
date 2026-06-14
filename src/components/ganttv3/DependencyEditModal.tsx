"use client";

import { useState } from "react";
import { Task, DependencyType } from "./gantt";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "../ui/dialog";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "../ui/command";
import { Plus, Trash2, Link2 } from "lucide-react";

interface DependencyEditModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** 編集対象（後続タスク） */
  task: Task | null;
  /** 先行タスクの候補（マイルストーン・自分自身は呼び出し側で除外して渡す） */
  candidateTasks: Task[];
  /** 依存追加（後続=task, 先行=predecessorId） */
  onAdd: (
    successorTaskId: string,
    predecessorTaskId: string,
    type: DependencyType,
    lag: number
  ) => void;
  /** 依存削除（DB上の依存ID） */
  onRemove: (dependencyDbId: number) => void;
}

export const DependencyEditModal = ({
  open,
  onOpenChange,
  task,
  candidateTasks,
  onAdd,
  onRemove,
}: DependencyEditModalProps) => {
  const [selectedPredecessor, setSelectedPredecessor] = useState<string>("");
  const [dependencyType, setDependencyType] = useState<DependencyType>("FS");
  const [lag, setLag] = useState<number>(0);

  const resetForm = () => {
    setSelectedPredecessor("");
    setDependencyType("FS");
    setLag(0);
  };

  const handleAdd = () => {
    if (!task || !selectedPredecessor) return;
    onAdd(task.id, selectedPredecessor, dependencyType, lag);
    resetForm();
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) resetForm();
    onOpenChange(next);
  };

  // 既に依存先として登録済みのタスクは候補から除外
  const existingPredIds = new Set(task?.predecessors.map((d) => d.taskId));
  const selectable = candidateTasks.filter((t) => !existingPredIds.has(t.id));

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5 text-blue-600" />
            依存関係を編集
            {task && (
              <span className="text-sm font-normal text-muted-foreground">
                — {task.name}
              </span>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* 既存の依存関係 */}
          <div className="space-y-2">
            <h3 className="text-sm font-medium">現在の先行タスク</h3>
            {!task || task.predecessors.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                依存関係が設定されていません。
              </p>
            ) : (
              <div className="space-y-1">
                {task.predecessors.map((dep, index) => {
                  const predTask = candidateTasks.find(
                    (t) => t.id === dep.taskId
                  );
                  return (
                    <div
                      key={index}
                      className="flex items-center justify-between bg-muted/30 px-3 py-2 rounded"
                    >
                      <span className="text-sm">
                        {predTask?.name || "不明"} ({dep.type})
                        {dep.lag !== 0 &&
                          ` ${dep.lag > 0 ? "+" : ""}${dep.lag}日`}
                      </span>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0 text-destructive"
                        disabled={dep.dbId === undefined}
                        onClick={() =>
                          dep.dbId !== undefined && onRemove(dep.dbId)
                        }
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* 新規追加 */}
          <div className="space-y-4 border-t pt-4">
            <h3 className="text-sm font-medium">先行タスクを追加</h3>

            <div>
              <label className="text-sm font-medium">先行タスク</label>
              <Command className="border rounded-md">
                <CommandInput placeholder="タスクを検索..." />
                <CommandList>
                  <CommandEmpty>タスクが見つかりません。</CommandEmpty>
                  <CommandGroup>
                    {selectable.map((t) => (
                      <CommandItem
                        key={t.id}
                        value={t.name}
                        onSelect={() => setSelectedPredecessor(t.id)}
                        className={
                          selectedPredecessor === t.id ? "bg-accent" : ""
                        }
                      >
                        {t.name}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">依存タイプ</label>
                <Select
                  value={dependencyType}
                  onValueChange={(value: DependencyType) =>
                    setDependencyType(value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="FS">Finish-to-Start (FS)</SelectItem>
                    <SelectItem value="SS">Start-to-Start (SS)</SelectItem>
                    <SelectItem value="FF">Finish-to-Finish (FF)</SelectItem>
                    <SelectItem value="SF">Start-to-Finish (SF)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium">ラグ/リード（日）</label>
                <Input
                  type="number"
                  value={lag}
                  onChange={(e) => setLag(e.target.valueAsNumber || 0)}
                  placeholder="0"
                />
              </div>
            </div>

            <Button
              onClick={handleAdd}
              disabled={!selectedPredecessor}
              className="w-full"
            >
              <Plus className="w-4 h-4 mr-2" />
              依存関係を追加
            </Button>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            閉じる
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
