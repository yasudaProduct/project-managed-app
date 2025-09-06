import React, { useState, useCallback } from "react";
import { Task, DependencyType, Dependency } from "./gantt";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
import { Input } from "../ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Checkbox } from "../ui/checkbox";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Textarea } from "../ui/textarea";
import { Calendar } from "../ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "../ui/command";
import {
  CalendarIcon,
  Plus,
  Trash2,
  // ChevronDown,
  ChevronRight,
  ChevronLeft,
  MoveUp,
  MoveDown,
  Copy,
  // Scissors,
  AlertTriangle,
} from "lucide-react";

interface TaskTableProps {
  tasks: Task[];
  onTaskUpdate: (task: Task) => void;
  onTaskDelete: (taskId: string) => void;
  onTaskAdd: (task: Omit<Task, "id">) => void;
  onTaskReorder: (taskId: string, direction: "up" | "down") => void;
  onTaskDuplicate: (taskId: string) => void;
  onTaskIndent: (taskId: string, direction: "indent" | "outdent") => void;
}

export const TaskTable = ({
  tasks,
  onTaskUpdate,
  onTaskDelete,
  onTaskAdd,
  onTaskReorder,
  onTaskDuplicate,
  onTaskIndent,
}: TaskTableProps) => {
  const [editingCell, setEditingCell] = useState<{
    taskId: string;
    field: string;
  } | null>(null);
  const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set());
  const [showDependencyPopover, setShowDependencyPopover] = useState<
    string | null
  >(null);

  const categories = Array.from(
    new Set(tasks.map((t) => t.category).filter(Boolean))
  );
  const colors = [
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
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const dependencyTypes: DependencyType[] = ["FS", "SS", "FF", "SF"];

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const handleCellEdit = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (taskId: string, field: string, value: any) => {
      const task = tasks.find((t) => t.id === taskId);
      if (!task) return;

      const updatedTask: Task = { ...task };

      switch (field) {
        case "name":
          updatedTask.name = value;
          break;
        case "startDate":
          updatedTask.startDate = value;
          // Recalculate end date based on duration
          if (!updatedTask.isMilestone) {
            updatedTask.endDate = addWorkingDays(
              value,
              updatedTask.duration - 1
            );
          } else {
            updatedTask.endDate = value;
          }
          break;
        case "endDate":
          updatedTask.endDate = value;
          // Recalculate duration
          if (!updatedTask.isMilestone) {
            updatedTask.duration = calculateWorkingDays(
              updatedTask.startDate,
              value
            );
          }
          break;
        case "duration":
          updatedTask.duration = Math.max(1, parseInt(value) || 1);
          // Recalculate end date
          if (!updatedTask.isMilestone) {
            updatedTask.endDate = addWorkingDays(
              updatedTask.startDate,
              updatedTask.duration - 1
            );
          }
          break;
        case "progress":
          updatedTask.progress = Math.min(
            100,
            Math.max(0, parseInt(value) || 0)
          );
          break;
        case "color":
          updatedTask.color = value;
          break;
        case "category":
          updatedTask.category = value;
          break;
        case "description":
          updatedTask.description = value;
          break;
        case "resources":
          updatedTask.resources = value
            .split(",")
            .map((r: string) => r.trim())
            .filter(Boolean);
          break;
        case "isMilestone":
          updatedTask.isMilestone = value;
          if (value) {
            updatedTask.duration = 0;
            updatedTask.endDate = updatedTask.startDate;
          } else {
            updatedTask.duration = Math.max(1, updatedTask.duration);
            updatedTask.endDate = addWorkingDays(
              updatedTask.startDate,
              updatedTask.duration - 1
            );
          }
          break;
        case "isManuallyScheduled":
          updatedTask.isManuallyScheduled = value;
          break;
      }

      onTaskUpdate(updatedTask);
      setEditingCell(null);
    },
    [tasks, onTaskUpdate]
  );

  const handleDependencyAdd = useCallback(
    (
      taskId: string,
      predecessorId: string,
      type: DependencyType,
      lag: number = 0
    ) => {
      const task = tasks.find((t) => t.id === taskId);
      if (!task) return;

      const newDependency: Dependency = {
        taskId: predecessorId,
        type,
        lag,
      };

      const updatedTask: Task = {
        ...task,
        predecessors: [...task.predecessors, newDependency],
      };

      onTaskUpdate(updatedTask);
    },
    [tasks, onTaskUpdate]
  );

  const handleDependencyRemove = useCallback(
    (taskId: string, dependencyIndex: number) => {
      const task = tasks.find((t) => t.id === taskId);
      if (!task) return;

      const updatedTask: Task = {
        ...task,
        predecessors: task.predecessors.filter(
          (_, index) => index !== dependencyIndex
        ),
      };

      onTaskUpdate(updatedTask);
    },
    [tasks, onTaskUpdate]
  );

  const calculateWorkingDays = (startDate: Date, endDate: Date): number => {
    let count = 0;
    const current = new Date(startDate);
    while (current <= endDate) {
      const dayOfWeek = current.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        count++;
      }
      current.setDate(current.getDate() + 1);
    }
    return Math.max(1, count);
  };

  const addWorkingDays = (startDate: Date, days: number): Date => {
    const result = new Date(startDate);
    let remaining = days;

    while (remaining > 0) {
      result.setDate(result.getDate() + 1);
      const dayOfWeek = result.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        remaining--;
      }
    }

    return result;
  };

  const handleSelectAll = useCallback(() => {
    if (selectedTasks.size === tasks.length) {
      setSelectedTasks(new Set());
    } else {
      setSelectedTasks(new Set(tasks.map((t) => t.id)));
    }
  }, [selectedTasks.size, tasks]);

  const handleTaskSelect = useCallback(
    (taskId: string) => {
      const newSelected = new Set(selectedTasks);
      if (newSelected.has(taskId)) {
        newSelected.delete(taskId);
      } else {
        newSelected.add(taskId);
      }
      setSelectedTasks(newSelected);
    },
    [selectedTasks]
  );

  const handleBulkDelete = useCallback(() => {
    selectedTasks.forEach((taskId) => onTaskDelete(taskId));
    setSelectedTasks(new Set());
  }, [selectedTasks, onTaskDelete]);

  const renderEditableCell = (
    task: Task,
    field: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    value: any,
    type:
      | "text"
      | "number"
      | "date"
      | "select"
      | "checkbox"
      | "color"
      | "textarea" = "text",
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    options?: any[]
  ) => {
    const isEditing =
      editingCell?.taskId === task.id && editingCell?.field === field;

    if (isEditing) {
      switch (type) {
        case "date":
          return (
            <Popover open={true} onOpenChange={() => setEditingCell(null)}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-start text-left"
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {value ? formatDate(value) : "Select date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={value}
                  onSelect={(date) =>
                    date && handleCellEdit(task.id, field, date)
                  }
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          );
        case "select":
          return (
            <Select
              value={value}
              onValueChange={(val) => handleCellEdit(task.id, field, val)}
              onOpenChange={(open) => !open && setEditingCell(null)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {options?.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          );
        case "checkbox":
          return (
            <Checkbox
              checked={value}
              onCheckedChange={(checked) =>
                handleCellEdit(task.id, field, checked)
              }
              onBlur={() => setEditingCell(null)}
            />
          );
        case "color":
          return (
            <div className="flex gap-1">
              {colors.map((color) => (
                <button
                  key={color}
                  className="w-6 h-6 rounded border-2 border-gray-300 hover:border-gray-500"
                  style={{ backgroundColor: color }}
                  onClick={() => handleCellEdit(task.id, field, color)}
                />
              ))}
            </div>
          );
        case "textarea":
          return (
            <Textarea
              value={value || ""}
              onChange={(e) => handleCellEdit(task.id, field, e.target.value)}
              onBlur={() => setEditingCell(null)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  setEditingCell(null);
                }
              }}
              autoFocus
              rows={3}
            />
          );
        default:
          return (
            <Input
              type={type}
              value={value || ""}
              onChange={(e) => {
                const val =
                  type === "number" ? e.target.valueAsNumber : e.target.value;
                handleCellEdit(task.id, field, val);
              }}
              onBlur={() => setEditingCell(null)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  setEditingCell(null);
                }
              }}
              autoFocus
            />
          );
      }
    }

    // Display mode
    switch (type) {
      case "date":
        return (
          <div
            className="cursor-pointer hover:bg-muted/50 p-1 rounded"
            onClick={() => setEditingCell({ taskId: task.id, field })}
          >
            {value ? formatDate(value) : "-"}
          </div>
        );
      case "checkbox":
        return (
          <Checkbox
            checked={value}
            onCheckedChange={(checked) =>
              handleCellEdit(task.id, field, checked)
            }
          />
        );
      case "color":
        return (
          <div
            className="flex items-center gap-2 cursor-pointer hover:bg-muted/50 p-1 rounded"
            onClick={() => setEditingCell({ taskId: task.id, field })}
          >
            <div
              className="w-4 h-4 rounded"
              style={{ backgroundColor: value }}
            />
            <span className="text-sm">{value}</span>
          </div>
        );
      default:
        return (
          <div
            className="cursor-pointer hover:bg-muted/50 p-1 rounded min-h-[24px]"
            onClick={() => setEditingCell({ taskId: task.id, field })}
          >
            {value || "-"}
          </div>
        );
    }
  };

  const renderDependencies = (task: Task) => {
    return (
      <div className="space-y-1">
        {task.predecessors.map((dep, index) => {
          const predTask = tasks.find((t) => t.id === dep.taskId);
          return (
            <div
              key={index}
              className="flex items-center justify-between bg-muted/30 p-1 rounded"
            >
              <span className="text-sm">
                {predTask?.name || "Unknown"} ({dep.type})
                {dep.lag !== 0 && ` ${dep.lag > 0 ? "+" : ""}${dep.lag}d`}
              </span>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleDependencyRemove(task.id, index)}
              >
                <Trash2 className="w-3 h-3" />
              </Button>
            </div>
          );
        })}
        <Popover
          open={showDependencyPopover === task.id}
          onOpenChange={(open) =>
            setShowDependencyPopover(open ? task.id : null)
          }
        >
          <PopoverTrigger asChild>
            <Button size="sm" variant="outline" className="w-full">
              <Plus className="w-3 h-3 mr-1" />
              Add Dependency
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80">
            <DependencySelector
              tasks={tasks.filter((t) => t.id !== task.id)}
              onAdd={(predId, type, lag) => {
                handleDependencyAdd(task.id, predId, type, lag);
                setShowDependencyPopover(null);
              }}
            />
          </PopoverContent>
        </Popover>
      </div>
    );
  };

  return (
    <div className="w-full">
      {/* Toolbar */}
      <div className="flex items-center justify-between p-4 border-b bg-card">
        <div className="flex items-center gap-2">
          <Button
            onClick={() =>
              onTaskAdd({
                name: "New Task",
                startDate: new Date(),
                endDate: new Date(),
                duration: 1,
                color: "#3B82F6",
                isMilestone: false,
                progress: 0,
                predecessors: [],
                level: 0,
                isManuallyScheduled: false,
                category: "General",
              })
            }
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Task
          </Button>
          {selectedTasks.size > 0 && (
            <>
              <Button variant="destructive" onClick={handleBulkDelete}>
                <Trash2 className="w-4 h-4 mr-2" />
                Delete Selected ({selectedTasks.size})
              </Button>
              <Button
                variant="outline"
                onClick={() => setSelectedTasks(new Set())}
              >
                Clear Selection
              </Button>
            </>
          )}
        </div>
        <div className="text-sm text-muted-foreground">
          {tasks.length} tasks • {selectedTasks.size} selected
        </div>
      </div>

      {/* Table */}
      <div className="overflow-auto max-h-[calc(100vh-200px)]">
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
              <TableHead className="w-10">Level</TableHead>
              <TableHead className="w-8">Actions</TableHead>
              <TableHead className="min-w-[200px]">Task Name</TableHead>
              <TableHead className="w-32">Start Date</TableHead>
              <TableHead className="w-32">End Date</TableHead>
              <TableHead className="w-20">Duration</TableHead>
              <TableHead className="w-20">Progress</TableHead>
              <TableHead className="w-24">Milestone</TableHead>
              <TableHead className="w-32">Category</TableHead>
              <TableHead className="w-24">Color</TableHead>
              <TableHead className="min-w-[200px]">Dependencies</TableHead>
              <TableHead className="w-24">Manual</TableHead>
              <TableHead className="w-24">Critical</TableHead>
              <TableHead className="min-w-[150px]">Resources</TableHead>
              <TableHead className="min-w-[200px]">Description</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tasks.map((task, index) => (
              <TableRow
                key={task.id}
                className={`${
                  selectedTasks.has(task.id) ? "bg-muted/50" : ""
                } ${
                  task.isOnCriticalPath ? "border-l-4 border-l-red-500" : ""
                }`}
              >
                <TableCell>
                  <Checkbox
                    checked={selectedTasks.has(task.id)}
                    onCheckedChange={() => handleTaskSelect(task.id)}
                  />
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <span className="text-sm">{task.level}</span>
                    <div className="flex flex-col">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-4 w-4 p-0"
                        onClick={() => onTaskIndent(task.id, "outdent")}
                        disabled={task.level === 0}
                      >
                        <ChevronLeft className="w-3 h-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-4 w-4 p-0"
                        onClick={() => onTaskIndent(task.id, "indent")}
                      >
                        <ChevronRight className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex flex-col gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 w-6 p-0"
                      onClick={() => onTaskReorder(task.id, "up")}
                      disabled={index === 0}
                    >
                      <MoveUp className="w-3 h-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 w-6 p-0"
                      onClick={() => onTaskReorder(task.id, "down")}
                      disabled={index === tasks.length - 1}
                    >
                      <MoveDown className="w-3 h-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 w-6 p-0"
                      onClick={() => onTaskDuplicate(task.id)}
                    >
                      <Copy className="w-3 h-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 w-6 p-0 text-destructive"
                      onClick={() => onTaskDelete(task.id)}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </TableCell>
                <TableCell>
                  <div style={{ paddingLeft: `${task.level * 16}px` }}>
                    {renderEditableCell(task, "name", task.name)}
                  </div>
                </TableCell>
                <TableCell>
                  {renderEditableCell(
                    task,
                    "startDate",
                    task.startDate,
                    "date"
                  )}
                </TableCell>
                <TableCell>
                  {renderEditableCell(task, "endDate", task.endDate, "date")}
                </TableCell>
                <TableCell>
                  {task.isMilestone ? (
                    <span className="text-muted-foreground">-</span>
                  ) : (
                    renderEditableCell(
                      task,
                      "duration",
                      task.duration,
                      "number"
                    )
                  )}
                </TableCell>
                <TableCell>
                  {renderEditableCell(
                    task,
                    "progress",
                    task.progress,
                    "number"
                  )}
                  %
                </TableCell>
                <TableCell>
                  {renderEditableCell(
                    task,
                    "isMilestone",
                    task.isMilestone,
                    "checkbox"
                  )}
                </TableCell>
                <TableCell>
                  {renderEditableCell(
                    task,
                    "category",
                    task.category,
                    "select",
                    [
                      ...categories,
                      "General",
                      "Planning",
                      "Development",
                      "Testing",
                      "Design",
                    ]
                  )}
                </TableCell>
                <TableCell>
                  {renderEditableCell(task, "color", task.color, "color")}
                </TableCell>
                <TableCell>{renderDependencies(task)}</TableCell>
                <TableCell>
                  {renderEditableCell(
                    task,
                    "isManuallyScheduled",
                    task.isManuallyScheduled,
                    "checkbox"
                  )}
                </TableCell>
                <TableCell>
                  {task.isOnCriticalPath && (
                    <Badge variant="destructive">
                      <AlertTriangle className="w-3 h-3 mr-1" />
                      Critical
                    </Badge>
                  )}
                </TableCell>
                <TableCell>
                  {renderEditableCell(
                    task,
                    "resources",
                    task.resources?.join(", ") || ""
                  )}
                </TableCell>
                <TableCell>
                  {renderEditableCell(
                    task,
                    "description",
                    task.description || "",
                    "textarea"
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

// Dependency Selector Component
interface DependencySelectorProps {
  tasks: Task[];
  onAdd: (taskId: string, type: DependencyType, lag: number) => void;
}

const DependencySelector = ({ tasks, onAdd }: DependencySelectorProps) => {
  const [selectedTask, setSelectedTask] = useState<string>("");
  const [dependencyType, setDependencyType] = useState<DependencyType>("FS");
  const [lag, setLag] = useState<number>(0);

  const handleAdd = () => {
    if (selectedTask) {
      onAdd(selectedTask, dependencyType, lag);
      setSelectedTask("");
      setLag(0);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="text-sm font-medium">Predecessor Task</label>
        <Command>
          <CommandInput placeholder="Search tasks..." />
          <CommandList>
            <CommandEmpty>No tasks found.</CommandEmpty>
            <CommandGroup>
              {tasks.map((task) => (
                <CommandItem
                  key={task.id}
                  value={task.id}
                  onSelect={() => setSelectedTask(task.id)}
                >
                  {task.name}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </div>

      <div>
        <label className="text-sm font-medium">Dependency Type</label>
        <Select
          value={dependencyType}
          onValueChange={(value: DependencyType) => setDependencyType(value)}
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
        <label className="text-sm font-medium">Lag/Lead (days)</label>
        <Input
          type="number"
          value={lag}
          onChange={(e) => setLag(e.target.valueAsNumber || 0)}
          placeholder="0"
        />
      </div>

      <Button onClick={handleAdd} disabled={!selectedTask} className="w-full">
        Add Dependency
      </Button>
    </div>
  );
};
