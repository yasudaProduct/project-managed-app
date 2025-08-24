import React, { useState, useCallback } from "react";
import { Task } from "./gantt";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Checkbox } from "../ui/checkbox";
import { Progress } from "../ui/progress";
import {
  Edit3,
  Check,
  X,
  Calendar,
  Target,
  AlertTriangle,
  ChevronRight,
  ChevronDown,
} from "lucide-react";
import { format } from "date-fns";

interface TableViewProps {
  tasks: Task[];
  selectedTasks: Set<string>;
  onTaskUpdate: (task: Task) => void;
  onTaskSelect: (selectedTasks: Set<string>) => void;
  onTaskAdd: (task: Omit<Task, "id">) => void;
}

export const TableView = ({
  tasks,
  selectedTasks,
  onTaskUpdate,
  onTaskSelect,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  onTaskAdd,
}: TableViewProps) => {
  const [editingTask, setEditingTask] = useState<string | null>(null);
  const [editedData, setEditedData] = useState<Partial<Task>>({});
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(["計画", "設計", "開発"])
  );

  const formatDate = (date: Date) => {
    try {
      return date.toLocaleDateString("ja-JP");
    } catch {
      return "無効な日付";
    }
  };

  const formatDateForInput = (date: Date) => {
    try {
      return format(date, "yyyy-MM-dd");
    } catch {
      return format(new Date(), "yyyy-MM-dd");
    }
  };

  const handleEdit = useCallback((task: Task) => {
    setEditingTask(task.id);
    setEditedData({
      name: task.name,
      startDate: task.startDate,
      endDate: task.endDate,
      progress: task.progress,
      category: task.category,
      description: task.description,
    });
  }, []);

  const handleSave = useCallback(() => {
    if (!editingTask) return;

    const task = tasks.find((t) => t.id === editingTask);
    if (!task) return;

    const updatedTask: Task = {
      ...task,
      ...editedData,
      duration:
        editedData.startDate && editedData.endDate
          ? Math.ceil(
              (editedData.endDate.getTime() - editedData.startDate.getTime()) /
                (1000 * 60 * 60 * 24)
            )
          : task.duration,
    };

    onTaskUpdate(updatedTask);
    setEditingTask(null);
    setEditedData({});
  }, [editingTask, editedData, tasks, onTaskUpdate]);

  const handleCancel = useCallback(() => {
    setEditingTask(null);
    setEditedData({});
  }, []);

  const handleSelectTask = useCallback(
    (taskId: string, checked: boolean) => {
      const newSelected = new Set(selectedTasks);
      if (checked) {
        newSelected.add(taskId);
      } else {
        newSelected.delete(taskId);
      }
      onTaskSelect(newSelected);
    },
    [selectedTasks, onTaskSelect]
  );

  const handleSelectAll = useCallback(() => {
    if (selectedTasks.size === tasks.length) {
      onTaskSelect(new Set());
    } else {
      onTaskSelect(new Set(tasks.map((t) => t.id)));
    }
  }, [selectedTasks.size, tasks, onTaskSelect]);

  const toggleCategory = useCallback(
    (category: string) => {
      const newExpanded = new Set(expandedCategories);
      if (newExpanded.has(category)) {
        newExpanded.delete(category);
      } else {
        newExpanded.add(category);
      }
      setExpandedCategories(newExpanded);
    },
    [expandedCategories]
  );

  // Group tasks by category
  const groupedTasks = tasks.reduce((acc, task) => {
    const category = task.category || "Uncategorized";
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(task);
    return acc;
  }, {} as Record<string, Task[]>);

  const getProgressColor = (progress: number) => {
    if (progress === 100) return "bg-green-500";
    if (progress >= 75) return "bg-blue-500";
    if (progress >= 50) return "bg-yellow-500";
    if (progress >= 25) return "bg-orange-500";
    return "bg-gray-400";
  };

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Table Header */}
      <div className="border-b bg-card px-4 py-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">プロジェクトタスク</h3>
          <div className="text-sm text-muted-foreground">
            {selectedTasks.size > 0 && `${selectedTasks.size} 選択中 • `}
            {tasks.length} タスク合計
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <Table>
          <TableHeader className="sticky top-0 bg-background z-10">
            <TableRow>
              <TableHead className="w-10">
                <Checkbox
                  checked={
                    selectedTasks.size === tasks.length && tasks.length > 0
                  }
                  onCheckedChange={handleSelectAll}
                />
              </TableHead>
              <TableHead className="min-w-[250px]">タスク</TableHead>
              <TableHead className="w-32">開始日</TableHead>
              <TableHead className="w-32">終了日</TableHead>
              <TableHead className="w-24">期間</TableHead>
              <TableHead className="w-32">進捗</TableHead>
              <TableHead className="w-28">ステータス</TableHead>
              <TableHead className="w-32">カテゴリ</TableHead>
              <TableHead className="min-w-[200px]">説明</TableHead>
              <TableHead className="w-20">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Object.entries(groupedTasks).map(([category, categoryTasks]) => (
              <React.Fragment key={category}>
                {/* Category Header */}
                <TableRow className="bg-muted/30 hover:bg-muted/40">
                  <TableCell colSpan={10}>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleCategory(category)}
                      className="gap-2 font-medium"
                    >
                      {expandedCategories.has(category) ? (
                        <ChevronDown className="w-4 h-4" />
                      ) : (
                        <ChevronRight className="w-4 h-4" />
                      )}
                      {category} ({categoryTasks.length} タスク)
                    </Button>
                  </TableCell>
                </TableRow>

                {/* Category Tasks */}
                {expandedCategories.has(category) &&
                  categoryTasks.map((task) => (
                    <TableRow
                      key={task.id}
                      className={`
                      ${selectedTasks.has(task.id) ? "bg-muted/50" : ""}
                      ${
                        task.isOnCriticalPath
                          ? "border-l-4 border-l-red-500"
                          : ""
                      }
                      hover:bg-muted/30
                    `}
                    >
                      {/* Selection */}
                      <TableCell>
                        <Checkbox
                          checked={selectedTasks.has(task.id)}
                          onCheckedChange={(checked) =>
                            handleSelectTask(task.id, checked as boolean)
                          }
                        />
                      </TableCell>

                      {/* Task Name */}
                      <TableCell>
                        <div
                          className="flex items-center gap-2"
                          style={{ paddingLeft: `${task.level * 16}px` }}
                        >
                          {task.isMilestone ? (
                            <Target className="w-4 h-4 text-orange-500" />
                          ) : (
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: task.color }}
                            />
                          )}
                          {editingTask === task.id ? (
                            <Input
                              value={editedData.name || ""}
                              onChange={(e) =>
                                setEditedData({
                                  ...editedData,
                                  name: e.target.value,
                                })
                              }
                              className="h-8"
                              autoFocus
                            />
                          ) : (
                            <div className="flex flex-col">
                              <span className="font-medium">{task.name}</span>
                              {task.isOnCriticalPath && (
                                <Badge
                                  variant="destructive"
                                  className="w-fit text-xs"
                                >
                                  <AlertTriangle className="w-3 h-3 mr-1" />
                                  クリティカルパス
                                </Badge>
                              )}
                            </div>
                          )}
                        </div>
                      </TableCell>

                      {/* Start Date */}
                      <TableCell>
                        {editingTask === task.id ? (
                          <Input
                            type="date"
                            value={
                              editedData.startDate
                                ? formatDateForInput(editedData.startDate)
                                : ""
                            }
                            onChange={(e) =>
                              setEditedData({
                                ...editedData,
                                startDate: new Date(e.target.value),
                              })
                            }
                            className="h-8"
                          />
                        ) : (
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-muted-foreground" />
                            {formatDate(task.startDate)}
                          </div>
                        )}
                      </TableCell>

                      {/* End Date */}
                      <TableCell>
                        {editingTask === task.id ? (
                          <Input
                            type="date"
                            value={
                              editedData.endDate
                                ? formatDateForInput(editedData.endDate)
                                : ""
                            }
                            onChange={(e) =>
                              setEditedData({
                                ...editedData,
                                endDate: new Date(e.target.value),
                              })
                            }
                            className="h-8"
                            disabled={task.isMilestone}
                          />
                        ) : (
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-muted-foreground" />
                            {task.isMilestone
                              ? "N/A"
                              : formatDate(task.endDate)}
                          </div>
                        )}
                      </TableCell>

                      {/* Duration */}
                      <TableCell>
                        {task.isMilestone ? (
                          <Badge variant="outline">マイルストーン</Badge>
                        ) : (
                          <span className="text-sm">{task.duration}d</span>
                        )}
                      </TableCell>

                      {/* Progress */}
                      <TableCell>
                        {editingTask === task.id ? (
                          <Input
                            type="number"
                            min="0"
                            max="100"
                            value={editedData.progress || 0}
                            onChange={(e) =>
                              setEditedData({
                                ...editedData,
                                progress: parseInt(e.target.value) || 0,
                              })
                            }
                            className="h-8 w-16"
                          />
                        ) : (
                          <div className="flex items-center gap-2">
                            <Progress
                              value={task.progress}
                              className="h-2 w-16"
                            />
                            <span className="text-sm font-medium">
                              {task.progress}%
                            </span>
                          </div>
                        )}
                      </TableCell>

                      {/* Status */}
                      <TableCell>
                        <Badge
                          variant={
                            task.progress === 100
                              ? "default"
                              : task.progress > 0
                              ? "secondary"
                              : "outline"
                          }
                          className="gap-1"
                        >
                          <div
                            className={`w-2 h-2 rounded-full ${getProgressColor(
                              task.progress
                            )}`}
                          />
                          {task.progress === 100
                            ? "完了"
                            : task.progress > 0
                            ? "進行中"
                            : "未開始"}
                        </Badge>
                      </TableCell>

                      {/* Category */}
                      <TableCell>
                        {editingTask === task.id ? (
                          <Input
                            value={editedData.category || ""}
                            onChange={(e) =>
                              setEditedData({
                                ...editedData,
                                category: e.target.value,
                              })
                            }
                            className="h-8"
                          />
                        ) : (
                          <Badge variant="outline">{task.category}</Badge>
                        )}
                      </TableCell>

                      {/* Description */}
                      <TableCell>
                        {editingTask === task.id ? (
                          <Input
                            value={editedData.description || ""}
                            onChange={(e) =>
                              setEditedData({
                                ...editedData,
                                description: e.target.value,
                              })
                            }
                            className="h-8"
                            placeholder="Task description..."
                          />
                        ) : (
                          <span className="text-sm text-muted-foreground">
                            {task.description || "説明なし"}
                          </span>
                        )}
                      </TableCell>

                      {/* Actions */}
                      <TableCell>
                        {editingTask === task.id ? (
                          <div className="flex items-center gap-1">
                            <Button
                              size="sm"
                              variant="default"
                              onClick={handleSave}
                            >
                              <Check className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={handleCancel}
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        ) : (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleEdit(task)}
                          >
                            <Edit3 className="w-4 h-4" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
              </React.Fragment>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};
