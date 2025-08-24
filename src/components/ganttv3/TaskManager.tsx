import { useState } from "react";
import { Task, GanttStyle } from "./gantt";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Card } from "../ui/card";
import { Badge } from "../ui/badge";
import { Trash2, Plus, Edit3 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { Checkbox } from "../ui/checkbox";
import { Slider } from "../ui/slider";

interface TaskManagerProps {
  tasks: Task[];
  onTaskUpdate: (task: Task) => void;
  onTaskDelete: (taskId: string) => void;
  onTaskAdd: (task: Omit<Task, "id">) => void;
  style: GanttStyle;
}

export const TaskManager = ({
  tasks,
  onTaskUpdate,
  onTaskDelete,
  onTaskAdd,
  style,
}: TaskManagerProps) => {
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [newTask, setNewTask] = useState({
    name: "",
    startDate: new Date().toISOString().split("T")[0],
    endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0],
    color: "#3B82F6",
    isMilestone: false,
    progress: 0,
    description: "",
    category: "General",
  });

  // Safe date formatting function
  const formatDateForInput = (date: Date): string => {
    try {
      if (!date || isNaN(date.getTime())) {
        return new Date().toISOString().split("T")[0];
      }
      return date.toISOString().split("T")[0];
    } catch (error) {
      console.warn("Invalid date:", date, error);
      return new Date().toISOString().split("T")[0];
    }
  };

  // Safe date display function
  const formatDateForDisplay = (date: Date): string => {
    try {
      if (!date || isNaN(date.getTime())) {
        return "無効な日付";
      }
      return date.toLocaleDateString();
    } catch (error) {
      console.warn("Invalid date:", date, error);
      return "無効な日付";
    }
  };

  const handleAddTask = () => {
    if (newTask.name.trim()) {
      const startDate = new Date(newTask.startDate);
      const endDate = new Date(newTask.endDate);

      // Validate dates
      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        alert("有効な日付を入力してください");
        return;
      }

      if (endDate < startDate) {
        alert("終了日は開始日より後である必要があります");
        return;
      }

      // Calculate duration in working days
      const duration = Math.max(
        1,
        Math.ceil(
          (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
        )
      );

      onTaskAdd({
        name: newTask.name,
        startDate,
        endDate,
        duration,
        color: newTask.color,
        isMilestone: newTask.isMilestone,
        progress: newTask.progress,
        predecessors: [],
        level: 0,
        isManuallyScheduled: false,
        category: newTask.category,
        description: newTask.description,
        resources: [],
      });

      // Reset form
      setNewTask({
        name: "",
        startDate: new Date().toISOString().split("T")[0],
        endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split("T")[0],
        color: "#3B82F6",
        isMilestone: false,
        progress: 0,
        description: "",
        category: "General",
      });
      setIsAddingTask(false);
    }
  };

  const handleUpdateTask = (task: Task) => {
    // Validate dates before updating
    if (
      !task.startDate ||
      !task.endDate ||
      isNaN(task.startDate.getTime()) ||
      isNaN(task.endDate.getTime())
    ) {
      alert("有効な日付を入力してください");
      return;
    }

    if (task.endDate < task.startDate && !task.isMilestone) {
      alert("終了日は開始日より後である必要があります");
      return;
    }

    // Recalculate duration
    const duration = task.isMilestone
      ? 0
      : Math.max(
          1,
          Math.ceil(
            (task.endDate.getTime() - task.startDate.getTime()) /
              (1000 * 60 * 60 * 24)
          )
        );

    onTaskUpdate({
      ...task,
      duration,
      endDate: task.isMilestone ? task.startDate : task.endDate,
    });
    setEditingTask(null);
  };

  const colorOptions = [
    "#3B82F6",
    "#10B981",
    "#F59E0B",
    "#EF4444",
    "#8B5CF6",
    "#06B6D4",
    "#84CC16",
    "#F97316",
    "#EC4899",
    "#6B7280",
  ];

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Task Manager</h3>
        <Button
          onClick={() => setIsAddingTask(true)}
          size="sm"
          className="gap-1"
        >
          <Plus className="w-4 h-4" />
          Add Task
        </Button>
      </div>

      {/* Add Task Dialog */}
      <Dialog open={isAddingTask} onOpenChange={setIsAddingTask}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Task</DialogTitle>
            <DialogDescription>
              Create a new task for your project timeline.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="taskName">Task Name</Label>
              <Input
                id="taskName"
                value={newTask.name}
                onChange={(e) =>
                  setNewTask({ ...newTask, name: e.target.value })
                }
                placeholder="Enter task name"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="startDate">Start Date</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={newTask.startDate}
                  onChange={(e) =>
                    setNewTask({ ...newTask, startDate: e.target.value })
                  }
                />
              </div>
              <div>
                <Label htmlFor="endDate">End Date</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={newTask.endDate}
                  onChange={(e) =>
                    setNewTask({ ...newTask, endDate: e.target.value })
                  }
                  disabled={newTask.isMilestone}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="category">カテゴリ</Label>
              <Input
                id="category"
                value={newTask.category}
                onChange={(e) =>
                  setNewTask({ ...newTask, category: e.target.value })
                }
                placeholder="カテゴリを入力"
              />
            </div>

            <div>
              <Label>Color</Label>
              <div className="flex gap-2 mt-2">
                {colorOptions.map((color) => (
                  <button
                    key={color}
                    className={`w-8 h-8 rounded-full border-2 ${
                      newTask.color === color
                        ? "border-foreground"
                        : "border-transparent"
                    }`}
                    style={{ backgroundColor: color }}
                    onClick={() => setNewTask({ ...newTask, color })}
                  />
                ))}
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="milestone"
                checked={newTask.isMilestone}
                onCheckedChange={(checked) => {
                  const isMilestone = checked as boolean;
                  setNewTask({
                    ...newTask,
                    isMilestone,
                    endDate: isMilestone ? newTask.startDate : newTask.endDate,
                    progress: isMilestone ? 0 : newTask.progress,
                  });
                }}
              />
              <Label htmlFor="milestone">マイルストーン</Label>
            </div>

            {!newTask.isMilestone && (
              <div>
                <Label>進捗: {newTask.progress}%</Label>
                <Slider
                  value={[newTask.progress]}
                  onValueChange={(value) =>
                    setNewTask({ ...newTask, progress: value[0] })
                  }
                  max={100}
                  step={5}
                  className="mt-2"
                />
              </div>
            )}

            <div>
              <Label htmlFor="description">説明</Label>
              <Input
                id="description"
                value={newTask.description}
                onChange={(e) =>
                  setNewTask({ ...newTask, description: e.target.value })
                }
                placeholder="説明（任意）"
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsAddingTask(false)}>
                キャンセル
              </Button>
              <Button onClick={handleAddTask}>タスク追加</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Task List */}
      <div className="space-y-2">
        {tasks.map((task) => (
          <Card
            key={task.id}
            className={`p-3 ${
              task.isOnCriticalPath && style.showCriticalPath
                ? "border-l-4 border-l-red-500"
                : ""
            }`}
          >
            <div className="flex items-center justify-between">
              <div
                className="flex items-center gap-3 flex-1"
                style={{ paddingLeft: `${task.level * 12}px` }}
              >
                <div
                  className="w-4 h-4 rounded-full"
                  style={{
                    backgroundColor:
                      task.isOnCriticalPath && style.showCriticalPath
                        ? style.colors.criticalPath
                        : task.color,
                  }}
                />
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{task.name}</div>
                  <div className="text-sm text-muted-foreground">
                    {formatDateForDisplay(task.startDate)} -{" "}
                    {formatDateForDisplay(task.endDate)}
                  </div>
                  {task.category && (
                    <div className="text-xs text-muted-foreground">
                      {task.category}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {task.isOnCriticalPath && style.showCriticalPath && (
                  <Badge variant="destructive" className="text-xs">
                    クリティカル
                  </Badge>
                )}
                {task.isMilestone ? (
                  <Badge variant="secondary">マイルストーン</Badge>
                ) : (
                  <Badge variant="outline">{task.progress}%</Badge>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setEditingTask(task)}
                >
                  <Edit3 className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onTaskDelete(task.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Edit Task Dialog */}
      {editingTask && (
        <Dialog open={!!editingTask} onOpenChange={() => setEditingTask(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>タスク編集</DialogTitle>
              <DialogDescription>
                タスクのプロパティと依存関係を変更します。
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="editTaskName">タスク名</Label>
                <Input
                  id="editTaskName"
                  value={editingTask.name}
                  onChange={(e) =>
                    setEditingTask({ ...editingTask, name: e.target.value })
                  }
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="editStartDate">開始日</Label>
                  <Input
                    id="editStartDate"
                    type="date"
                    value={formatDateForInput(editingTask.startDate)}
                    onChange={(e) =>
                      setEditingTask({
                        ...editingTask,
                        startDate: new Date(e.target.value),
                      })
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="editEndDate">終了日</Label>
                  <Input
                    id="editEndDate"
                    type="date"
                    value={formatDateForInput(editingTask.endDate)}
                    onChange={(e) =>
                      setEditingTask({
                        ...editingTask,
                        endDate: new Date(e.target.value),
                      })
                    }
                    disabled={editingTask.isMilestone}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="editCategory">カテゴリ</Label>
                <Input
                  id="editCategory"
                  value={editingTask.category || ""}
                  onChange={(e) =>
                    setEditingTask({ ...editingTask, category: e.target.value })
                  }
                  placeholder="カテゴリを入力"
                />
              </div>

              <div>
                <Label>Color</Label>
                <div className="flex gap-2 mt-2">
                  {colorOptions.map((color) => (
                    <button
                      key={color}
                      className={`w-8 h-8 rounded-full border-2 ${
                        editingTask.color === color
                          ? "border-foreground"
                          : "border-transparent"
                      }`}
                      style={{ backgroundColor: color }}
                      onClick={() => setEditingTask({ ...editingTask, color })}
                    />
                  ))}
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="editMilestone"
                  checked={editingTask.isMilestone}
                  onCheckedChange={(checked) => {
                    const isMilestone = checked as boolean;
                    setEditingTask({
                      ...editingTask,
                      isMilestone,
                      endDate: isMilestone
                        ? editingTask.startDate
                        : editingTask.endDate,
                      progress: isMilestone ? 0 : editingTask.progress,
                      duration: isMilestone ? 0 : editingTask.duration,
                    });
                  }}
                />
                <Label htmlFor="editMilestone">マイルストーン</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="editManual"
                  checked={editingTask.isManuallyScheduled}
                  onCheckedChange={(checked) =>
                    setEditingTask({
                      ...editingTask,
                      isManuallyScheduled: checked as boolean,
                    })
                  }
                />
                <Label htmlFor="editManual">手動スケジュール</Label>
              </div>

              {!editingTask.isMilestone && (
                <div>
                  <Label>進捗: {editingTask.progress}%</Label>
                  <Slider
                    value={[editingTask.progress]}
                    onValueChange={(value) =>
                      setEditingTask({ ...editingTask, progress: value[0] })
                    }
                    max={100}
                    step={5}
                    className="mt-2"
                  />
                </div>
              )}

              <div>
                <Label htmlFor="editDescription">説明</Label>
                <Input
                  id="editDescription"
                  value={editingTask.description || ""}
                  onChange={(e) =>
                    setEditingTask({
                      ...editingTask,
                      description: e.target.value,
                    })
                  }
                  placeholder="説明（任意）"
                />
              </div>

              {editingTask.predecessors &&
                editingTask.predecessors.length > 0 && (
                  <div>
                    <Label>依存関係</Label>
                    <div className="text-sm text-muted-foreground mt-1">
                      {editingTask.predecessors.map((dep, index) => {
                        const predTask = tasks.find((t) => t.id === dep.taskId);
                        return (
                          <div key={index}>
                            {predTask?.name || "不明"} ({dep.type})
                            {dep.lag !== 0 &&
                              ` ${dep.lag > 0 ? "+" : ""}${dep.lag}d`}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setEditingTask(null)}>
                  キャンセル
                </Button>
                <Button onClick={() => handleUpdateTask(editingTask)}>
                  タスク更新
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};
