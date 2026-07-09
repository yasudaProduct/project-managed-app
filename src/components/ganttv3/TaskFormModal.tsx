import { useEffect, useState } from "react";
import { GanttPhase, TaskStatus } from "./gantt";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";

export interface NewTaskInput {
  name: string;
  phaseId: number;
  phaseName: string;
  assigneeId?: number;
  assigneeName?: string;
  startDate: Date;
  endDate: Date;
  yoteiKosu: number;
  status: TaskStatus;
}

interface TaskFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: GanttPhase[];
  assignees: { id: number; name: string }[];
  onSubmit: (input: NewTaskInput) => void;
}

const STATUS_OPTIONS: { value: TaskStatus; label: string }[] = [
  { value: "NOT_STARTED", label: "未開始" },
  { value: "IN_PROGRESS", label: "進行中" },
  { value: "COMPLETED", label: "完了" },
  { value: "ON_HOLD", label: "保留" },
];

const NO_ASSIGNEE = "__none__";

const toDateInput = (date: Date): string => date.toISOString().split("T")[0];

const getInitialForm = () => ({
  name: "",
  phaseId: "",
  assigneeId: NO_ASSIGNEE,
  startDate: toDateInput(new Date()),
  endDate: toDateInput(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)),
  yoteiKosu: "0",
  status: "NOT_STARTED" as TaskStatus,
});

/**
 * タスク追加モーダル
 *
 * 編集モードで「タスク追加」を押すと開き、内容を入力して「追加」を押すと
 * ガント上（ローカル状態）へ反映される。DBへの反映は保存時に行う。
 */
export const TaskFormModal = ({
  open,
  onOpenChange,
  categories,
  assignees,
  onSubmit,
}: TaskFormModalProps) => {
  const [form, setForm] = useState(getInitialForm());
  const [error, setError] = useState<string | null>(null);

  // モーダルを開くたびにフォームを初期化する
  useEffect(() => {
    if (open) {
      setForm(getInitialForm());
      setError(null);
    }
  }, [open]);

  const handleSubmit = () => {
    if (!form.name.trim()) {
      setError("タスク名を入力してください");
      return;
    }
    if (!form.phaseId) {
      setError("フェーズを選択してください");
      return;
    }

    const startDate = new Date(form.startDate);
    const endDate = new Date(form.endDate);
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      setError("有効な日付を入力してください");
      return;
    }
    if (endDate < startDate) {
      setError("終了日は開始日以降にしてください");
      return;
    }

    const phase = categories.find((c) => c.id === form.phaseId);
    if (!phase) {
      setError("フェーズを選択してください");
      return;
    }

    const assignee =
      form.assigneeId !== NO_ASSIGNEE
        ? assignees.find((a) => a.id.toString() === form.assigneeId)
        : undefined;

    onSubmit({
      name: form.name.trim(),
      phaseId: Number(phase.id),
      phaseName: phase.name,
      assigneeId: assignee?.id,
      assigneeName: assignee?.name,
      startDate,
      endDate,
      yoteiKosu: Number(form.yoteiKosu) || 0,
      status: form.status,
    });

    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>タスク追加</DialogTitle>
          <DialogDescription>
            タスクの内容を入力してください。「追加」でガントに反映し、「保存」でデータベースに登録します。
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="gantt-task-name">タスク名</Label>
            <Input
              id="gantt-task-name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="タスク名を入力"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="gantt-task-phase">フェーズ</Label>
              <Select
                value={form.phaseId}
                onValueChange={(value) => setForm({ ...form, phaseId: value })}
              >
                <SelectTrigger id="gantt-task-phase">
                  <SelectValue placeholder="選択" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="gantt-task-assignee">担当者</Label>
              <Select
                value={form.assigneeId}
                onValueChange={(value) =>
                  setForm({ ...form, assigneeId: value })
                }
              >
                <SelectTrigger id="gantt-task-assignee">
                  <SelectValue placeholder="未割当" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_ASSIGNEE}>未割当</SelectItem>
                  {assignees.map((assignee) => (
                    <SelectItem
                      key={assignee.id}
                      value={assignee.id.toString()}
                    >
                      {assignee.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="gantt-task-start">予定開始日</Label>
              <Input
                id="gantt-task-start"
                type="date"
                value={form.startDate}
                onChange={(e) =>
                  setForm({ ...form, startDate: e.target.value })
                }
              />
            </div>
            <div>
              <Label htmlFor="gantt-task-end">予定終了日</Label>
              <Input
                id="gantt-task-end"
                type="date"
                value={form.endDate}
                onChange={(e) => setForm({ ...form, endDate: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="gantt-task-kosu">予定工数（時間）</Label>
              <Input
                id="gantt-task-kosu"
                type="number"
                min={0}
                step={0.5}
                value={form.yoteiKosu}
                onChange={(e) =>
                  setForm({ ...form, yoteiKosu: e.target.value })
                }
              />
            </div>
            <div>
              <Label htmlFor="gantt-task-status">ステータス</Label>
              <Select
                value={form.status}
                onValueChange={(value: TaskStatus) =>
                  setForm({ ...form, status: value })
                }
              >
                <SelectTrigger id="gantt-task-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              キャンセル
            </Button>
            <Button onClick={handleSubmit}>追加</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
