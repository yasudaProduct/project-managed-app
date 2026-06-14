"use client";

import { useEffect, useMemo, useState } from "react";
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
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "../ui/command";
import {
  Plus,
  Trash2,
  Link2,
  Pencil,
  Check,
  X,
  AlertTriangle,
} from "lucide-react";

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
  /** 依存更新（DB上の依存ID＋新しい内容）。未指定なら既存依存のインライン編集は無効 */
  onUpdate?: (
    dependencyDbId: number,
    successorTaskId: string,
    predecessorTaskId: string,
    type: DependencyType,
    lag: number
  ) => void;
}

// 依存タイプの一覧（表示順）
const TYPE_OPTIONS: { type: DependencyType; label: string }[] = [
  { type: "FS", label: "完了したら開始" },
  { type: "SS", label: "同時に開始" },
  { type: "FF", label: "同時に完了" },
  { type: "SF", label: "開始したら完了" },
];

// ミニ図のバー位置（[左%, 右%]）。上=先行(青) / 下=後続(灰)
const TYPE_DIAGRAM: Record<
  DependencyType,
  { pred: [number, number]; succ: [number, number] }
> = {
  FS: { pred: [0, 52], succ: [48, 100] },
  SS: { pred: [0, 60], succ: [0, 75] },
  FF: { pred: [40, 100], succ: [25, 100] },
  SF: { pred: [48, 100], succ: [0, 52] },
};

// 既存リスト用のコンパクトな日本語表現
const TYPE_LABEL: Record<DependencyType, string> = {
  FS: "完了したら開始",
  SS: "同時に開始",
  FF: "同時に完了",
  SF: "開始したら完了",
};

function lagSuffix(lag: number): string {
  if (lag > 0) return `・${lag}日あけて`;
  if (lag < 0) return `・${Math.abs(lag)}日前倒し`;
  return "";
}

// ライブプレビュー用の自然文を組み立てる
function buildSentence(
  successorName: string,
  predecessorName: string,
  type: DependencyType,
  lag: number
): string {
  const predEvent = type === "FS" || type === "FF" ? "完了" : "開始";
  const succEvent = type === "FS" || type === "SS" ? "開始" : "完了";
  const timing =
    lag > 0 ? `の${lag}日後` : lag < 0 ? `の${Math.abs(lag)}日前` : "後";
  return `「${predecessorName}」の${predEvent}${timing}に「${successorName}」を${succEvent}します`;
}

// 2本のバーで依存タイプを図示する
function TypeMiniDiagram({ type }: { type: DependencyType }) {
  const d = TYPE_DIAGRAM[type];
  const bar = (range: [number, number], cls: string) => (
    <div className="h-2 w-full">
      <div
        className={`h-2 rounded-sm ${cls}`}
        style={{
          marginLeft: `${range[0]}%`,
          width: `${range[1] - range[0]}%`,
        }}
      />
    </div>
  );
  return (
    <div className="flex w-full flex-col gap-1">
      {bar(d.pred, "bg-blue-500")}
      {bar(d.succ, "bg-slate-400")}
    </div>
  );
}

// 依存タイプを選ぶビジュアルカード
function TypePicker({
  value,
  onChange,
}: {
  value: DependencyType;
  onChange: (type: DependencyType) => void;
}) {
  return (
    <div className="grid grid-cols-4 gap-2">
      {TYPE_OPTIONS.map((o) => (
        <button
          key={o.type}
          type="button"
          onClick={() => onChange(o.type)}
          className={`flex flex-col items-center gap-1.5 rounded-md border p-2 text-center transition-colors ${
            value === o.type
              ? "border-blue-500 bg-blue-50 ring-1 ring-blue-500"
              : "border-border hover:bg-muted/50"
          }`}
        >
          <TypeMiniDiagram type={o.type} />
          <span className="text-[11px] leading-tight">{o.label}</span>
          <span className="text-[10px] text-muted-foreground">{o.type}</span>
        </button>
      ))}
    </div>
  );
}

// 間隔（ラグ/リード）を直感的に編集する
function IntervalEditor({
  value,
  onChange,
}: {
  value: number;
  onChange: (lag: number) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex items-center gap-1">
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-8 px-2"
          onClick={() => onChange(value - 1)}
        >
          −1日
        </Button>
        <Button
          type="button"
          size="sm"
          variant={value === 0 ? "default" : "outline"}
          className="h-8 px-2"
          onClick={() => onChange(0)}
        >
          0
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-8 px-2"
          onClick={() => onChange(value + 1)}
        >
          +1日
        </Button>
      </div>
      <div className="flex items-center gap-1">
        <Input
          type="number"
          value={value}
          onChange={(e) => onChange(e.target.valueAsNumber || 0)}
          className="h-8 w-20"
        />
        <span className="text-xs text-muted-foreground">日</span>
      </div>
      <span className="text-[11px] text-muted-foreground">
        ＋：あけて / −：前倒し
      </span>
    </div>
  );
}

export const DependencyEditModal = ({
  open,
  onOpenChange,
  task,
  candidateTasks,
  onAdd,
  onRemove,
  onUpdate,
}: DependencyEditModalProps) => {
  const [selectedPredecessor, setSelectedPredecessor] = useState<string>("");
  const [dependencyType, setDependencyType] = useState<DependencyType>("FS");
  const [lag, setLag] = useState<number>(0);

  // 既存依存のインライン編集状態
  const [editingDbId, setEditingDbId] = useState<number | null>(null);
  const [editType, setEditType] = useState<DependencyType>("FS");
  const [editLag, setEditLag] = useState<number>(0);

  const resetForm = () => {
    setSelectedPredecessor("");
    setDependencyType("FS");
    setLag(0);
    setEditingDbId(null);
  };

  useEffect(() => {
    if (!open) resetForm();
  }, [open]);

  const taskById = useMemo(
    () => new Map(candidateTasks.map((t) => [t.id, t])),
    [candidateTasks]
  );

  // 先行タスク候補に current.id への依存チェーンが含まれると循環になる
  const wouldCreateCycle = (predecessorId: string): boolean => {
    if (!task) return false;
    const visited = new Set<string>();
    const stack = [predecessorId];
    while (stack.length > 0) {
      const current = stack.pop()!;
      if (current === task.id) return true;
      if (visited.has(current)) continue;
      visited.add(current);
      const node = taskById.get(current);
      node?.predecessors.forEach((p) => stack.push(p.taskId));
    }
    return false;
  };

  const handleAdd = () => {
    if (!task || !selectedPredecessor) return;
    if (wouldCreateCycle(selectedPredecessor)) return;
    onAdd(task.id, selectedPredecessor, dependencyType, lag);
    resetForm();
  };

  const startEdit = (dbId: number, type: DependencyType, currentLag: number) => {
    setEditingDbId(dbId);
    setEditType(type);
    setEditLag(currentLag);
  };

  const saveEdit = (predecessorTaskId: string) => {
    if (!task || editingDbId === null || !onUpdate) return;
    onUpdate(editingDbId, task.id, predecessorTaskId, editType, editLag);
    setEditingDbId(null);
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) resetForm();
    onOpenChange(next);
  };

  // 既に依存先として登録済みのタスク・循環するタスクは候補から除外
  const existingPredIds = new Set(task?.predecessors.map((d) => d.taskId));
  const selectable = candidateTasks.filter((t) => !existingPredIds.has(t.id));

  const selectedTask = selectedPredecessor
    ? taskById.get(selectedPredecessor)
    : undefined;
  const cycleOnSelected = selectedPredecessor
    ? wouldCreateCycle(selectedPredecessor)
    : false;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-xl">
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
            <h3 className="text-sm font-medium">
              このタスクの前に終わらせるタスク（先行）
            </h3>
            {!task || task.predecessors.length === 0 ? (
              <p className="rounded-md border border-dashed px-3 py-4 text-center text-sm text-muted-foreground">
                まだ先行タスクはありません。下から追加できます。
              </p>
            ) : (
              <div className="space-y-1.5">
                {task.predecessors.map((dep, index) => {
                  const predTask = taskById.get(dep.taskId);
                  const isEditing = dep.dbId !== undefined && editingDbId === dep.dbId;

                  if (isEditing) {
                    return (
                      <div
                        key={index}
                        className="space-y-3 rounded-md border border-blue-300 bg-blue-50/40 p-3"
                      >
                        <div className="flex items-center gap-2 text-sm font-medium">
                          <span
                            className="h-2.5 w-2.5 flex-shrink-0 rounded-sm"
                            style={{ backgroundColor: predTask?.color }}
                          />
                          {predTask?.name || "不明"}
                        </div>
                        <TypePicker value={editType} onChange={setEditType} />
                        <IntervalEditor value={editLag} onChange={setEditLag} />
                        {task && predTask && (
                          <p className="text-xs text-muted-foreground">
                            {buildSentence(
                              task.name,
                              predTask.name,
                              editType,
                              editLag
                            )}
                          </p>
                        )}
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setEditingDbId(null)}
                          >
                            <X className="mr-1 h-4 w-4" />
                            キャンセル
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => saveEdit(dep.taskId)}
                          >
                            <Check className="mr-1 h-4 w-4" />
                            保存
                          </Button>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={index}
                      className="flex items-center justify-between gap-2 rounded-md bg-muted/40 px-3 py-2"
                    >
                      <div className="flex min-w-0 items-center gap-2">
                        <span
                          className="h-2.5 w-2.5 flex-shrink-0 rounded-sm"
                          style={{ backgroundColor: predTask?.color }}
                        />
                        <span className="truncate text-sm font-medium">
                          {predTask?.name || "不明"}
                        </span>
                        <span className="flex-shrink-0 text-xs text-muted-foreground">
                          {TYPE_LABEL[dep.type]}
                          {lagSuffix(dep.lag)}
                        </span>
                      </div>
                      <div className="flex flex-shrink-0 items-center gap-0.5">
                        {onUpdate && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0"
                            disabled={dep.dbId === undefined}
                            onClick={() =>
                              dep.dbId !== undefined &&
                              startEdit(dep.dbId, dep.type, dep.lag)
                            }
                            title="編集"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0 text-destructive"
                          disabled={dep.dbId === undefined}
                          onClick={() =>
                            dep.dbId !== undefined && onRemove(dep.dbId)
                          }
                          title="削除"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* 新規追加 */}
          <div className="space-y-4 border-t pt-4">
            <h3 className="text-sm font-medium">先行タスクを追加</h3>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">先行タスク</label>
              <Command className="rounded-md border">
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
                        <span
                          className="mr-2 h-2.5 w-2.5 flex-shrink-0 rounded-sm"
                          style={{ backgroundColor: t.color }}
                        />
                        {t.name}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">つながり方</label>
              <TypePicker value={dependencyType} onChange={setDependencyType} />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">間隔</label>
              <IntervalEditor value={lag} onChange={setLag} />
            </div>

            {/* ライブプレビュー */}
            {selectedTask && task && (
              <div
                className={`rounded-md border px-3 py-2 text-sm ${
                  cycleOnSelected
                    ? "border-destructive/40 bg-destructive/5 text-destructive"
                    : "border-blue-200 bg-blue-50/50"
                }`}
              >
                {cycleOnSelected ? (
                  <span className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                    このタスクが循環依存になるため追加できません。
                  </span>
                ) : (
                  <span className="text-muted-foreground">
                    {buildSentence(
                      task.name,
                      selectedTask.name,
                      dependencyType,
                      lag
                    )}
                  </span>
                )}
              </div>
            )}

            <Button
              onClick={handleAdd}
              disabled={!selectedPredecessor || cycleOnSelected}
              className="w-full"
            >
              <Plus className="mr-2 h-4 w-4" />
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
