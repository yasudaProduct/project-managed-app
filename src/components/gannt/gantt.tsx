"use client";

import { TaskStatus, Wbs } from "@/types/wbs";
import { Gantt, Task, ViewMode } from "gantt-task-react";
import "gantt-task-react/dist/index.css";
import { Button } from "../ui/button";
import { useEffect, useState } from "react";
import {
  ColumnVisibility,
  ColumnVisibilityToggle,
} from "./column-visibility-toggle";
import { getTaskStatusName } from "@/lib/utils";
import { Pencil, Trash2, ChevronDown, ChevronRight } from "lucide-react";
import EditDialog from "./edit-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Label } from "../ui/label";

interface GanttComponentProps {
  tasks: Task[];
  wbs: Wbs;
}

declare module "gantt-task-react" {
  interface Task {
    assignee: {
      id: string;
      name: string;
    };
    phase: {
      id: number;
      name: string;
      seq: number;
    };
    yoteiStart: Date | undefined;
    yoteiEnd: Date | undefined;
    yoteiKosu: number;
    status: TaskStatus;
  }
}

export default function GanttComponent({
  tasks: taskProp,
  wbs,
}: GanttComponentProps) {
  const [viewMode, setViewMode] = useState<ViewMode>(ViewMode.Day);
  const [columnVisibility, setColumnVisibility] = useState<ColumnVisibility>({
    phase: true,
    wbsno: true,
    assignee: true,
    yotei: true,
    start: true,
    end: true,
    kosu: true,
    status: true,
    operation: true,
    all: true,
  });
  const [tasks, setTasks] = useState<Task[]>(taskProp);
  const [selectedAssignee, setSelectedAssignee] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");

  useEffect(() => {
    const filteredTasks = taskProp.filter((task) => {
      if (task.type === "project") {
        return true;
      }

      return (
        (selectedStatus === "all" || task.status === selectedStatus) &&
        (selectedAssignee === "all" || task.assignee.name === selectedAssignee)
      );
    });

    setTasks(filteredTasks);
  }, [taskProp, selectedStatus, selectedAssignee]);

  const handleColumnVisibilityToggle = (column: keyof ColumnVisibility) => {
    if (column === "all" && columnVisibility.all) {
      setColumnVisibility((prev) => ({
        ...prev,
        phase: false,
        wbsno: false,
        assignee: false,
        yotei: false,
        start: false,
        end: false,
        kosu: false,
        status: false,
        operation: false,
        all: false,
      }));
    } else if (column === "all" && !columnVisibility.all) {
      setColumnVisibility((prev) => ({
        ...prev,
        phase: true,
        wbsno: true,
        assignee: true,
        yotei: true,
        start: true,
        end: true,
        kosu: true,
        status: true,
        operation: true,
        all: true,
      }));
    } else {
      setColumnVisibility((prev) => ({ ...prev, [column]: !prev[column] }));
    }
  };

  const columnWidths = {
    phase: "5rem",
    task: "5rem",
    wbsId: "61px",
    tanto: "42px",
    start: "5rem",
    end: "5rem",
    progress: "20px",
    kosu: "3rem",
    status: "3rem",
    operation: "3rem",
  };

  const TaskListHeader: React.FC<{
    headerHeight: number;
    rowWidth: string;
    fontFamily: string;
    fontSize: string;
  }> = ({ headerHeight, rowWidth, fontFamily, fontSize }) => {
    return (
      <div
        className="flex items-center gap-4 px-4 bg-gray-100 font-semibold text-sm text-gray-700"
        style={{ height: headerHeight, width: rowWidth, fontFamily, fontSize }}
      >
        {columnVisibility.phase && (
          <div
            className="flex items-center justify-center h-full"
            style={{ width: columnWidths.phase }}
          >
            工程
          </div>
        )}
        <div
          className="flex items-center justify-center h-full"
          style={{ width: columnWidths.task }}
        >
          タスク名
        </div>
        {columnVisibility.wbsno && (
          <div
            className="flex items-center justify-center h-full"
            style={{ width: columnWidths.wbsId }}
          >
            WBSNO
          </div>
        )}

        {columnVisibility.assignee && (
          <div
            className="flex items-center justify-center h-full"
            style={{ width: columnWidths.tanto }}
          >
            担当
          </div>
        )}
        {columnVisibility.yotei && (
          <div
            className="flex items-center justify-center h-full"
            style={{ width: columnWidths.start }}
          >
            開始日
          </div>
        )}
        {columnVisibility.yotei && (
          <div
            className="flex items-center justify-center h-full"
            style={{ width: columnWidths.end }}
          >
            終了日
          </div>
        )}
        {columnVisibility.yotei && (
          <div
            className="flex items-center justify-center h-full"
            style={{ width: columnWidths.kosu }}
          >
            工数
          </div>
        )}
        {columnVisibility.status && (
          <div
            className="flex items-center justify-center h-full"
            style={{ width: columnWidths.status }}
          >
            状況
          </div>
        )}
        {columnVisibility.operation && (
          <div
            className="flex items-center justify-center h-full"
            style={{ width: columnWidths.operation }}
          >
            操作
          </div>
        )}
      </div>
    );
  };

  const TaskListTable: React.FC<{
    rowHeight: number;
    rowWidth: string;
    fontFamily: string;
    fontSize: string;
    locale: string;
    tasks: Task[];
    selectedTaskId: string;
    setSelectedTask: (taskId: string) => void;
    onExpanderClick: (task: Task) => void;
  }> = ({ tasks, rowHeight, fontSize, onExpanderClick }) => {
    return (
      <div className="text-xs">
        {tasks.map((task) => (
          <div
            key={task.taskNo}
            className="flex items-center gap-4 px-4 border-b border-gray-200 text-sm"
            style={{
              height: rowHeight,
              fontSize: fontSize,
              backgroundColor: task.type === "project" ? "#f0f0f0" : "",
            }}
          >
            {/* 工程 */}
            {columnVisibility.phase &&
              (task.type === "project" ? (
                <div style={{ width: columnWidths.phase }}>
                  <button
                    onClick={() => {
                      onExpanderClick(task);
                    }}
                    className="mr-2"
                  >
                    {task.hideChildren ? (
                      <ChevronRight className="w-2 h-2" />
                    ) : (
                      <ChevronDown className="w-2 h-2" />
                    )}
                  </button>
                  {task.phase.name}
                </div>
              ) : (
                <div className={"pl-4"} style={{ width: columnWidths.phase }}>
                  {task.phase.name}
                </div>
              ))}
            {/* タスク名 */}
            <div
              className="truncate _nI1Xw flex flex-col items-center justify-center h-full border-l"
              style={{ width: columnWidths.task }}
            >
              <div className="">{task.name}</div>
            </div>

            {/* WBSNO */}
            {columnVisibility.wbsno && (
              <div
                className="flex flex-col items-center justify-center h-full border-l"
                style={{ width: columnWidths.wbsId }}
              >
                {task.type === "project" ? "-" : task.taskNo}
              </div>
            )}

            {/* 担当 */}
            {columnVisibility.assignee && (
              <div
                className="flex flex-col items-center justify-center h-full border-l"
                style={{ width: columnWidths.tanto }}
              >
                {task.assignee.name}
              </div>
            )}

            {/* 開始日 */}
            {columnVisibility.yotei && (
              <div
                className="flex flex-col items-center justify-center h-full border-l"
                style={{ width: columnWidths.start }}
              >
                <div>
                  {task.yoteiStart // undefinedの場合、表示させたくないためyoteiをチェック
                    ? task.start.toLocaleDateString("ja-JP")
                    : "-"}
                </div>
              </div>
            )}

            {/* 終了日 */}
            {columnVisibility.yotei && (
              <div
                className="flex flex-col items-center justify-center h-full border-l"
                style={{ width: columnWidths.end }}
              >
                <div>
                  {task.yoteiEnd // undefinedの場合、表示させたくないためyoteiをチェック
                    ? task.end.toLocaleDateString("ja-JP")
                    : "-"}
                </div>
              </div>
            )}

            {/* 工数 */}
            {columnVisibility.yotei && (
              <div
                style={{ width: columnWidths.kosu }}
                className="flex items-center justify-center h-full border-l"
              >
                {task.type === "task" ? task.yoteiKosu : "-"}
              </div>
            )}

            {/* 状況 */}
            {columnVisibility.status && (
              <div
                style={{ width: columnWidths.status }}
                className="flex items-center justify-center h-full border-l"
              >
                {getTaskStatusName(task.status)}
              </div>
            )}

            {/* 操作 */}
            {columnVisibility.operation && (
              <div
                style={{ width: columnWidths.status }}
                className="flex items-center justify-center h-full border-l"
              >
                {task.type === "project" ? (
                  <></>
                ) : (
                  <>
                    <button
                      onClick={() => handleTaskDelete(task)}
                      className="text-red-500 mr-2"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <EditDialog task={task} wbsId={wbs.id}>
                      <button>
                        <Pencil className="w-4 h-4" />
                      </button>
                    </EditDialog>
                  </>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

  const handleTaskChange = (task: Task) => {
    console.log("On date change Id:" + task.taskNo);

    // taskPropから直接新しい配列を作成
    const newTasks = taskProp.map((t) => (t.taskNo === task.taskNo ? task : t));

    // フィルタリングを適用して状態を更新
    const filteredTasks = newTasks.filter((t) => {
      if (t.type === "project") {
        return true;
      }
      return (
        (selectedStatus === "all" || t.status === selectedStatus) &&
        (selectedAssignee === "all" || t.assignee.name === selectedAssignee)
      );
    });

    setTasks(filteredTasks);
  };

  const handleTaskDelete = (task: Task) => {
    const conf = window.confirm(
      `このタスクを本当に削除しますか？ \n\n ${task.name + " " + task.taskNo}`
    );
    if (conf) {
      const newTasks = taskProp.filter((t) => t.taskNo !== task.taskNo);
      const filteredTasks = newTasks.filter((t) => {
        if (t.type === "project") {
          return true;
        }
        return (
          (selectedStatus === "all" || t.status === selectedStatus) &&
          (selectedAssignee === "all" || t.assignee.name === selectedAssignee)
        );
      });
      setTasks(filteredTasks);
    }
    return conf;
  };

  const handleDblClick = (task: Task) => {
    alert("On Double Click event Id:" + task.taskNo);
  };

  const handleExpanderClick = (task: Task) => {
    const newTasks = taskProp.map((t) =>
      t.taskNo === task.taskNo ? { ...t, hideChildren: !t.hideChildren } : t
    );
    const filteredTasks = newTasks.filter((t) => {
      if (t.type === "project") {
        return true;
      }
      return (
        (selectedStatus === "all" || t.status === selectedStatus) &&
        (selectedAssignee === "all" || t.assignee.name === selectedAssignee)
      );
    });
    setTasks(filteredTasks);
  };

  return (
    <div className="container mx-auto">
      <div className="flex justify-start gap-2 mb-2 mt-2">
        <Button
          variant="outline"
          onClick={() => setViewMode(ViewMode.Year)}
          className={viewMode === ViewMode.Year ? "bg-gray-500 text-white" : ""}
        >
          年
        </Button>
        <Button
          variant="outline"
          onClick={() => setViewMode(ViewMode.Month)}
          className={
            viewMode === ViewMode.Month ? "bg-gray-500 text-white" : ""
          }
        >
          月
        </Button>
        <Button
          variant="outline"
          onClick={() => setViewMode(ViewMode.Week)}
          className={viewMode === ViewMode.Week ? "bg-gray-500 text-white" : ""}
        >
          週
        </Button>
        <Button
          variant="outline"
          onClick={() => setViewMode(ViewMode.Day)}
          className={viewMode === ViewMode.Day ? "bg-gray-500 text-white" : ""}
        >
          日
        </Button>
        <Button
          variant="outline"
          onClick={() => setViewMode(ViewMode.Hour)}
          className={viewMode === ViewMode.Hour ? "bg-gray-500 text-white" : ""}
        >
          時
        </Button>
        <Button
          variant="outline"
          onClick={() => setViewMode(ViewMode.QuarterDay)}
          className={
            viewMode === ViewMode.QuarterDay ? "bg-gray-500 text-white" : ""
          }
        >
          4時間
        </Button>
        <Button
          variant="outline"
          onClick={() => setViewMode(ViewMode.HalfDay)}
          className={
            viewMode === ViewMode.HalfDay ? "bg-gray-500 text-white" : ""
          }
        >
          8時間
        </Button>

        <ColumnVisibilityToggle
          columnVisibility={columnVisibility}
          onToggle={handleColumnVisibilityToggle}
        />
      </div>
      <div className="flex justify-start gap-2 mb-2 mt-2">
        <div className="flex items-center gap-2">
          <Label>状況</Label>
          <Select
            value={selectedStatus}
            onValueChange={(value) => setSelectedStatus(value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="状況を選択" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem key="all" value="all">
                全て
              </SelectItem>
              {Array.from(new Set(taskProp.map((t) => t.status))).map(
                (status) => (
                  <SelectItem key={status} value={status}>
                    {getTaskStatusName(status as TaskStatus)}
                  </SelectItem>
                )
              )}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <Label>担当</Label>
          <Select
            value={selectedAssignee}
            onValueChange={(value) => setSelectedAssignee(value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="担当を選択" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem key="all" value="all">
                全て
              </SelectItem>
              {Array.from(new Set(taskProp.map((t) => t.assignee.name))).map(
                (assigneeName) => (
                  <SelectItem key={assigneeName} value={assigneeName}>
                    {assigneeName}
                  </SelectItem>
                )
              )}
            </SelectContent>
          </Select>
        </div>
      </div>
      <Gantt
        tasks={tasks}
        viewMode={viewMode}
        viewDate={new Date()}
        // listCellWidth={isTalebeHide ? "100" : ""}
        listCellWidth={"100"}
        // fontSize="10px"
        rowHeight={40}
        barCornerRadius={5}
        barFill={95}
        preStepsCount={100}
        locale="ja-JP"
        TaskListHeader={TaskListHeader}
        TaskListTable={TaskListTable}
        onDateChange={handleTaskChange}
        onDelete={handleTaskDelete}
        onDoubleClick={handleDblClick}
        onExpanderClick={handleExpanderClick} // 反応しない
      />
    </div>
  );
}
