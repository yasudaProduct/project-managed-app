import React, { useState, useCallback, useMemo } from "react";
import { Task, GanttPhase } from "./gantt";
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
import { Calendar } from "../ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Textarea } from "../ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../ui/dialog";
import {
  Edit3,
  Check,
  X,
  Calendar as CalendarIcon,
  Target,
  AlertTriangle,
  ChevronRight,
  ChevronDown,
  Users,
  Plus,
  FolderPlus,
  Indent,
  Outdent,
  Trash2,
} from "lucide-react";

type TaskKey = keyof Task;

interface EnhancedTableViewProps {
  tasks: Task[];
  categories: GanttPhase[];
  selectedTasks: Set<string>;
  onTaskUpdate: (task: Task) => void;
  onTaskSelect: (selectedTasks: Set<string>) => void;
  onTaskAdd: (task: Omit<Task, "id">) => void;
  onTaskMove: (taskId: string, newCategory: string) => void;
  onCategoryUpdate: (category: GanttPhase) => void;
  onCategoryAdd: (category: Omit<GanttPhase, "id">) => void;
  onCategoryDelete?: (category: GanttPhase) => void;
  onTaskIndent?: (taskId: string) => void;
  onTaskOutdent?: (taskId: string) => void;
}

interface TaskRowProps {
  task: Task;
  categories: GanttPhase[];
  isSelected: boolean;
  onTaskUpdate: (task: Task) => void;
  onTaskSelect: (taskId: string, selected: boolean) => void;
  onTaskMove: (taskId: string, newCategory: string) => void;
  onTaskIndent?: (taskId: string) => void;
  onTaskOutdent?: (taskId: string) => void;
}

const TaskRow: React.FC<TaskRowProps> = ({
  task,
  categories,
  isSelected,
  onTaskUpdate,
  onTaskSelect,
  onTaskMove,
  onTaskIndent,
  onTaskOutdent,
}) => {
  const [editingField, setEditingField] = useState<TaskKey | null>(null);
  const [editedData, setEditedData] = useState<Partial<Task>>({});

  const formatDate = (date: Date) => {
    try {
      return date.toLocaleDateString("ja-JP", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return "無効な日付";
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleEdit = useCallback((field: TaskKey, value: any) => {
    setEditingField(field);
    setEditedData((prev) => ({ ...prev, [field]: value } as Partial<Task>));
  }, []);

  // const handleSave = useCallback(
  //   // (field: TaskKey) => {
  //     // const updatedTask = { ...task, ...editedData };
  //     // if (field === "resources" && typeof editedData[field] === "string") {
  //     //   updatedTask.resources = editedData[field]
  //     //     .split(",")
  //     //     .map((r: string) => r.trim())
  //     //     .filter(Boolean);
  //     // }
  //     // if (field === "progress") {
  //     //   const progress = Math.max(
  //     //     0,
  //     //     Math.min(100, parseInt(editedData[field] as string) || 0)
  //     //   );
  //     //   updatedTask.progress = progress;
  //     // }
  //     // // Recalculate duration if dates changed
  //     // if (field === "startDate" || field === "endDate") {
  //     //   if (
  //     //     updatedTask.startDate &&
  //     //     updatedTask.endDate &&
  //     //     !updatedTask.isMilestone
  //     //   ) {
  //     //     updatedTask.duration = Math.max(
  //     //       1,
  //     //       Math.ceil(
  //     //         (updatedTask.endDate.getTime() -
  //     //           updatedTask.startDate.getTime()) /
  //     //           (1000 * 60 * 60 * 24)
  //     //       )
  //     //     );
  //     //   }
  //     // }
  //     // onTaskUpdate(updatedTask);
  //     // setEditingField(null);
  //     // setEditedData({});
  //   // },
  //   [task, editedData, onTaskUpdate]
  // );

  const handleCancel = useCallback(() => {
    setEditingField(null);
    setEditedData({});
  }, []);

  const handleDateChange = useCallback(
    (field: "startDate" | "endDate", date: Date | undefined) => {
      if (!date) return;

      const updatedTask = { ...task, [field]: date };

      if (field === "startDate" || field === "endDate") {
        if (
          updatedTask.startDate &&
          updatedTask.endDate &&
          !updatedTask.isMilestone
        ) {
          updatedTask.duration = Math.max(
            1,
            Math.ceil(
              (updatedTask.endDate.getTime() -
                updatedTask.startDate.getTime()) /
                (1000 * 60 * 60 * 24)
            )
          );
        }
      }
      onTaskUpdate(updatedTask);
    },
    [task, onTaskUpdate]
  );

  const handleCategoryChange = useCallback(
    (newCategory: string) => {
      onTaskMove(task.id, newCategory);
    },
    [task.id, onTaskMove]
  );

  const getProgressColor = (progress: number) => {
    if (progress === 100) return "bg-green-500";
    if (progress >= 75) return "bg-blue-500";
    if (progress >= 50) return "bg-yellow-500";
    if (progress >= 25) return "bg-orange-500";
    return "bg-gray-400";
  };

  const renderEditableField = (
    field: TaskKey,
    value: unknown,
    type: "text" | "textarea" | "number" | "select" = "text"
  ) => {
    const isEditing = editingField === field;

    if (isEditing) {
      switch (type) {
        case "textarea":
          return (
            <div className="space-y-2">
              <Textarea
                value={String(editedData[field] ?? "")}
                onChange={(e) =>
                  setEditedData(
                    (prev) =>
                      ({ ...prev, [field]: e.target.value } as Partial<Task>)
                  )
                }
                className="min-h-[60px]"
                autoFocus
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  // onClick={() => handleSave(field)}
                >
                  <Check className="w-4 h-4" />
                </Button>
                <Button size="sm" variant="outline" onClick={handleCancel}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
          );
        case "number":
          return (
            <div className="flex items-center gap-2">
              <Input
                type="number"
                value={
                  typeof editedData[field] === "number"
                    ? (editedData[field] as number)
                    : 0
                }
                onChange={(e) =>
                  setEditedData(
                    (prev) =>
                      ({
                        ...prev,
                        [field]: parseInt(e.target.value) || 0,
                      } as Partial<Task>)
                  )
                }
                className="w-20"
                min="0"
                max={field === "progress" ? 100 : undefined}
                autoFocus
              />
              <Button
                size="sm"
                // onClick={() => handleSave(field)}
              >
                <Check className="w-4 h-4" />
              </Button>
              <Button size="sm" variant="outline" onClick={handleCancel}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          );
        default:
          return (
            <div className="flex items-center gap-2">
              <Input
                value={
                  typeof editedData[field] === "string"
                    ? (editedData[field] as string)
                    : ""
                }
                onChange={(e) =>
                  setEditedData(
                    (prev) =>
                      ({ ...prev, [field]: e.target.value } as Partial<Task>)
                  )
                }
                className="flex-1"
                autoFocus
              />
              <Button
                size="sm"
                // onClick={() => handleSave(field)}
              >
                <Check className="w-4 h-4" />
              </Button>
              <Button size="sm" variant="outline" onClick={handleCancel}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          );
      }
    }

    // Display mode
    switch (field) {
      case "category":
        return (
          <Select
            value={typeof value === "string" ? value : undefined}
            onValueChange={handleCategoryChange}
          >
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {categories.map((category) => (
                <SelectItem key={category.id} value={category.name}>
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: category.color }}
                    />
                    {category.name}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      case "progress":
        const progressValue = typeof value === "number" ? value : 0;
        return (
          <div
            className="cursor-pointer"
            onClick={() => handleEdit(field, value)}
          >
            <div className="flex items-center gap-2">
              <Progress value={progressValue} className="h-2 w-16" />
              <span className="text-sm font-medium">{progressValue}%</span>
            </div>
          </div>
        );
      case "description":
        return (
          <div
            className="cursor-pointer hover:bg-muted/50 p-2 rounded min-h-[32px] transition-colors"
            onClick={() => handleEdit(field, value)}
          >
            <span className="text-sm text-muted-foreground">
              {(value as string) || "Click to add description..."}
            </span>
          </div>
        );
      case "resources":
        const resourceArray = Array.isArray(value) ? (value as string[]) : [];
        return (
          <div
            className="cursor-pointer hover:bg-muted/50 p-2 rounded min-h-[32px] transition-colors"
            onClick={() => handleEdit(field, resourceArray.join(", "))}
          >
            {resourceArray.length > 0 ? (
              <div className="flex items-center gap-1">
                <Users className="w-3 h-3" />
                <span className="text-sm">
                  {resourceArray.slice(0, 2).join(", ")}
                </span>
                {resourceArray.length > 2 && (
                  <span className="text-xs text-muted-foreground">
                    +{resourceArray.length - 2}
                  </span>
                )}
              </div>
            ) : (
              <span className="text-sm text-muted-foreground">
                Click to add resources...
              </span>
            )}
          </div>
        );
      default:
        return (
          <div
            className="cursor-pointer hover:bg-muted/50 p-2 rounded min-h-[32px] transition-colors"
            onClick={() => handleEdit(field, value)}
          >
            <span className="text-sm">
              {(value as string) || "Click to edit..."}
            </span>
          </div>
        );
    }
  };

  const renderDateField = (field: "startDate" | "endDate", date: Date) => {
    return (
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="justify-start gap-2 w-full"
          >
            <CalendarIcon className="w-4 h-4" />
            {formatDate(date)}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={date}
            onSelect={(newDate) => handleDateChange(field, newDate)}
            initialFocus
          />
        </PopoverContent>
      </Popover>
    );
  };

  return (
    <TableRow
      className={`
        ${isSelected ? "bg-primary/5 border-primary/20" : ""}
        ${task.isOnCriticalPath ? "border-l-4 border-l-red-500" : ""}
        hover:bg-muted/30 transition-colors group
      `}
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("text/plain", task.id);
      }}
    >
      {/* Selection & Controls */}
      <TableCell className="w-20">
        <div className="flex items-center gap-1">
          <Checkbox
            checked={isSelected}
            onCheckedChange={(checked) =>
              onTaskSelect(task.id, checked as boolean)
            }
          />
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={(e) => {
                e.stopPropagation();
                onTaskOutdent?.(task.id);
              }}
              disabled={task.level === 0}
            >
              <Outdent className="w-3 h-3" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={(e) => {
                e.stopPropagation();
                onTaskIndent?.(task.id);
              }}
              disabled={task.level >= 3}
            >
              <Indent className="w-3 h-3" />
            </Button>
          </div>
        </div>
      </TableCell>

      {/* Task Name */}
      <TableCell className="min-w-[250px]">
        <div
          className="flex items-center gap-2"
          style={{ paddingLeft: `${task.level * 16}px` }}
        >
          {task.isMilestone ? (
            <Target className="w-4 h-4 text-orange-500" />
          ) : (
            <div
              className="w-3 h-3 rounded-full flex-shrink-0"
              style={{ backgroundColor: task.color }}
            />
          )}
          <div className="flex-1 min-w-0">
            {renderEditableField("name", task.name)}
            {task.isOnCriticalPath && (
              <Badge variant="destructive" className="mt-1 text-xs">
                <AlertTriangle className="w-3 h-3 mr-1" />
                Critical Path
              </Badge>
            )}
          </div>
        </div>
      </TableCell>

      {/* Start Date */}
      <TableCell className="w-40">
        {renderDateField("startDate", task.startDate)}
      </TableCell>

      {/* End Date */}
      <TableCell className="w-40">
        {task.isMilestone ? (
          <Badge variant="outline" className="w-full justify-center">
            Milestone
          </Badge>
        ) : (
          renderDateField("endDate", task.endDate)
        )}
      </TableCell>

      {/* Duration */}
      <TableCell className="w-20 text-center">
        {task.isMilestone ? (
          <span className="text-sm text-muted-foreground">0d</span>
        ) : (
          <span className="text-sm font-medium">{task.duration}d</span>
        )}
      </TableCell>

      {/* Progress */}
      <TableCell className="w-32">
        {task.isMilestone ? (
          <span className="text-sm text-muted-foreground">N/A</span>
        ) : (
          renderEditableField("progress", task.progress, "number")
        )}
      </TableCell>

      {/* Status */}
      <TableCell className="w-32">
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
            ? "Complete"
            : task.progress > 0
            ? "In Progress"
            : "Not Started"}
        </Badge>
      </TableCell>

      {/* Category */}
      <TableCell className="w-40">
        {renderEditableField("category", task.category, "select")}
      </TableCell>

      {/* Resources */}
      <TableCell className="min-w-[150px]">
        {renderEditableField("resources", task.resources)}
      </TableCell>

      {/* Description */}
      <TableCell className="min-w-[200px]">
        {renderEditableField("description", task.description, "textarea")}
      </TableCell>
    </TableRow>
  );
};

interface CategoryHeaderProps {
  category: GanttPhase;
  tasks: Task[];
  isExpanded: boolean;
  onToggle: () => void;
  onCategoryUpdate: (category: GanttPhase) => void;
  onCategoryDelete?: (category: GanttPhase) => void;
  onTaskMove: (taskId: string, newCategory: string) => void;
}

const CategoryHeader: React.FC<CategoryHeaderProps> = ({
  category,
  tasks,
  isExpanded,
  onToggle,
  onCategoryUpdate,
  onCategoryDelete,
  onTaskMove,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState(category.name);

  // Calculate category date range from tasks
  const categoryDates = useMemo(() => {
    if (tasks.length === 0) {
      return { startDate: null, endDate: null };
    }

    const dates = tasks.map((task) => ({
      start: task.startDate,
      end: task.endDate,
    }));
    const startDate = new Date(
      Math.min(...dates.map((d) => d.start.getTime()))
    );
    const endDate = new Date(Math.max(...dates.map((d) => d.end.getTime())));

    return { startDate, endDate };
  }, [tasks]);

  const handleSave = () => {
    onCategoryUpdate({ ...category, name: editedName });
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditedName(category.name);
    setIsEditing(false);
  };

  const formatDate = (date: Date) => {
    try {
      return date.toLocaleDateString("ja-JP", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return "無効な日付";
    }
  };

  const avgProgress =
    tasks.length > 0
      ? Math.round(
          tasks.reduce((sum, task) => sum + task.progress, 0) / tasks.length
        )
      : 0;

  return (
    <TableRow
      className="bg-muted/30 hover:bg-muted/50 transition-colors border-b-2 group"
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        const taskId = e.dataTransfer.getData("text/plain");
        if (taskId) {
          onTaskMove(taskId, category.name);
        }
      }}
    >
      <TableCell colSpan={10}>
        <div className="flex items-center justify-between py-3">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={onToggle}
              className="p-0 h-6 w-6"
            >
              {isExpanded ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
            </Button>

            <div
              className="w-4 h-4 rounded-full flex-shrink-0"
              style={{ backgroundColor: category.color }}
            />

            {isEditing ? (
              <div className="flex items-center gap-2">
                <Input
                  value={editedName}
                  onChange={(e) => setEditedName(e.target.value)}
                  className="h-8"
                  autoFocus
                />
                <Button size="sm" onClick={handleSave}>
                  <Check className="w-4 h-4" />
                </Button>
                <Button size="sm" variant="outline" onClick={handleCancel}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="font-semibold text-lg">{category.name}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsEditing(true)}
                  className="p-0 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Edit3 className="w-3 h-3" />
                </Button>
                {onCategoryDelete && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onCategoryDelete(category)}
                    className="p-0 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity hover:text-red-600"
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                )}
              </div>
            )}

            <Badge variant="outline" className="ml-2">
              {tasks.length} tasks
            </Badge>
          </div>

          <div className="flex items-center gap-6 text-sm text-muted-foreground">
            {categoryDates.startDate && categoryDates.endDate && (
              <div className="flex items-center gap-2">
                <CalendarIcon className="w-4 h-4" />
                <span>
                  {formatDate(categoryDates.startDate)} -{" "}
                  {formatDate(categoryDates.endDate)}
                </span>
              </div>
            )}

            <div className="flex items-center gap-2">
              <Progress value={avgProgress} className="h-2 w-20" />
              <span className="font-medium">{avgProgress}% complete</span>
            </div>
          </div>
        </div>
      </TableCell>
    </TableRow>
  );
};

interface AddCategoryDialogProps {
  onCategoryAdd: (category: Omit<GanttPhase, "id">) => void;
}

const AddCategoryDialog: React.FC<AddCategoryDialogProps> = ({
  onCategoryAdd,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState("");
  const [color, setColor] = useState("#3B82F6");

  const predefinedColors = [
    "#3B82F6",
    "#10B981",
    "#8B5CF6",
    "#F59E0B",
    "#EF4444",
    "#06B6D4",
    "#84CC16",
    "#F97316",
    "#EC4899",
    "#6366F1",
  ];

  const handleSubmit = () => {
    if (name.trim()) {
      onCategoryAdd({
        name: name.trim(),
        color: color,
      });
      setName("");
      setColor("#3B82F6");
      setIsOpen(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <FolderPlus className="w-4 h-4 mr-2" />
          Add Category
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add New Category</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <label htmlFor="name" className="text-right">
              Name
            </label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="col-span-3"
              placeholder="Enter category name"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <label htmlFor="color" className="text-right">
              Color
            </label>
            <div className="col-span-3">
              <div className="flex gap-2 mb-2">
                {predefinedColors.map((presetColor) => (
                  <button
                    key={presetColor}
                    type="button"
                    className={`w-6 h-6 rounded-full border-2 ${
                      color === presetColor
                        ? "border-gray-400"
                        : "border-gray-200"
                    }`}
                    style={{ backgroundColor: presetColor }}
                    onClick={() => setColor(presetColor)}
                  />
                ))}
              </div>
              <Input
                id="color"
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="h-8"
              />
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!name.trim()}>
            Add Category
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export const EnhancedTableView: React.FC<EnhancedTableViewProps> = ({
  tasks,
  categories,
  selectedTasks,
  onTaskUpdate,
  onTaskSelect,
  onTaskAdd,
  onTaskMove,
  onCategoryUpdate,
  onCategoryAdd,
  onCategoryDelete,
  onTaskIndent,
  onTaskOutdent,
}) => {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(categories.map((c) => c.name))
  );

  const handleTaskSelect = useCallback(
    (taskId: string, selected: boolean) => {
      const newSelected = new Set(selectedTasks);
      if (selected) {
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
    (categoryName: string) => {
      const newExpanded = new Set(expandedCategories);
      if (newExpanded.has(categoryName)) {
        newExpanded.delete(categoryName);
      } else {
        newExpanded.add(categoryName);
      }
      setExpandedCategories(newExpanded);
    },
    [expandedCategories]
  );

  const expandAllCategories = useCallback(() => {
    setExpandedCategories(new Set(categories.map((c) => c.name)));
  }, [categories]);

  const collapseAllCategories = useCallback(() => {
    setExpandedCategories(new Set());
  }, []);

  // Group tasks by category
  const groupedTasks = useMemo(() => {
    const grouped: Record<string, Task[]> = {};

    // Initialize all categories
    categories.forEach((category) => {
      grouped[category.name] = [];
    });

    // Add uncategorized if there are tasks without category
    if (tasks.some((task) => !task.category)) {
      grouped["Uncategorized"] = [];
    }

    // Group tasks
    tasks.forEach((task) => {
      const categoryName = task.category || "Uncategorized";
      if (!grouped[categoryName]) {
        grouped[categoryName] = [];
      }
      grouped[categoryName].push(task);
    });

    return grouped;
  }, [tasks, categories]);

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Table Header */}
      <div className="border-b bg-card px-4 py-3 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h3 className="font-semibold">Project Tasks</h3>
            <Button
              size="sm"
              onClick={() =>
                onTaskAdd({
                  name: "New Task",
                  startDate: new Date(),
                  endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
                  duration: 5,
                  color: "#3B82F6",
                  isMilestone: false,
                  progress: 0,
                  predecessors: [],
                  level: 0,
                  isManuallyScheduled: false,
                  category: "Planning",
                  description: "",
                  resources: [],
                })
              }
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Task
            </Button>
            <AddCategoryDialog onCategoryAdd={onCategoryAdd} />
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={expandAllCategories}>
                Expand All
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={collapseAllCategories}
              >
                Collapse All
              </Button>
            </div>
            <div className="text-sm text-muted-foreground">
              {selectedTasks.size > 0 && `${selectedTasks.size} selected • `}
              {tasks.length} total tasks
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <Table>
          <TableHeader className="sticky top-0 bg-background z-10 border-b">
            <TableRow>
              <TableHead className="w-20">
                <Checkbox
                  checked={
                    selectedTasks.size === tasks.length && tasks.length > 0
                  }
                  onCheckedChange={handleSelectAll}
                />
              </TableHead>
              <TableHead className="min-w-[250px]">Task</TableHead>
              <TableHead className="w-40">Start Date</TableHead>
              <TableHead className="w-40">End Date</TableHead>
              <TableHead className="w-20 text-center">Duration</TableHead>
              <TableHead className="w-32">Progress</TableHead>
              <TableHead className="w-32">Status</TableHead>
              <TableHead className="w-40">Category</TableHead>
              <TableHead className="min-w-[150px]">Resources</TableHead>
              <TableHead className="min-w-[200px]">Description</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Object.entries(groupedTasks).map(
              ([categoryName, categoryTasks]) => {
                const category = categories.find(
                  (c) => c.name === categoryName
                ) || {
                  id: categoryName,
                  name: categoryName,
                  color: "#6B7280",
                };

                return (
                  <React.Fragment key={categoryName}>
                    <CategoryHeader
                      category={category}
                      tasks={categoryTasks}
                      isExpanded={expandedCategories.has(categoryName)}
                      onToggle={() => toggleCategory(categoryName)}
                      onCategoryUpdate={onCategoryUpdate}
                      onCategoryDelete={onCategoryDelete}
                      onTaskMove={onTaskMove}
                    />

                    {expandedCategories.has(categoryName) &&
                      categoryTasks.map((task) => (
                        <TaskRow
                          key={task.id}
                          task={task}
                          categories={categories}
                          isSelected={selectedTasks.has(task.id)}
                          onTaskUpdate={onTaskUpdate}
                          onTaskSelect={handleTaskSelect}
                          onTaskMove={onTaskMove}
                          onTaskIndent={onTaskIndent}
                          onTaskOutdent={onTaskOutdent}
                        />
                      ))}
                  </React.Fragment>
                );
              }
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};
