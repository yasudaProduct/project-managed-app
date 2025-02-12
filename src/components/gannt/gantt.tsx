"use client";

import { TaskStatus, Wbs } from "@/types/wbs";
import { Gantt, Task, ViewMode } from "gantt-task-react";
import "gantt-task-react/dist/index.css";
import { Button } from "../ui/button";
import { useState } from "react";
import {
  ColumnVisibility,
  ColumnVisibilityToggle,
} from "./column-visibility-toggle";
import { getTaskStatusName } from "@/lib/utils";
import { Pencil, Trash2 } from "lucide-react";
import EditDialog from "./edit-dialog";

interface GanttComponentProps {
  tasks: Task[];
  wbs: Wbs;
}

declare module "gantt-task-react" {
  interface Task {
    assignee: string;
    kosu: number;
    status: TaskStatus;
    yoteiStart: Date | undefined;
    yoteiEnd: Date | undefined;
  }
}

export default function GanttComponent({
  tasks: taskProp,
}: GanttComponentProps) {
  const [viewMode, setViewMode] = useState<ViewMode>(ViewMode.Day);
  const [isTalebeHide, setIsTalebeHide] = useState(true);
  const [columnVisibility, setColumnVisibility] = useState<ColumnVisibility>({
    wbsno: true,
    assignee: true,
    yotei: true,
    start: true,
    end: true,
    kosu: true,
    status: true,
  });
  const [tasks, setTasks] = useState<Task[]>(taskProp);

  const handleColumnVisibilityToggle = (column: keyof ColumnVisibility) => {
    setColumnVisibility((prev) => ({ ...prev, [column]: !prev[column] }));
  };

  const columnWidths = {
    task: "5rem",
    wbsId: "61px",
    tanto: "42px",
    start: "5rem",
    end: "5rem",
    progress: "20px",
    kosu: "3rem",
    status: "3rem",
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
        <div style={{ width: columnWidths.task }}>タスク名</div>
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
            key={task.id}
            className="flex items-center gap-4 px-4 border-b border-gray-200 text-sm"
            style={{
              height: rowHeight,
              fontSize: fontSize,
              backgroundColor: task.type === "project" ? "#f0f0f0" : "",
            }}
          >
            {/* タスク名 */}
            <div
              className="truncate _nI1Xw"
              style={{ width: columnWidths.task }}
            >
              {task.type === "project" ? (
                <button
                  className="flex flex-col items-center justify-center h-full border-l"
                  onClick={() => onExpanderClick(task)}
                >
                  {task.hideChildren ? "▶" : "▼"}
                </button>
              ) : (
                <div className="ml-2">{task.name}</div>
              )}
            </div>

            {/* WBSNO */}
            {columnVisibility.wbsno &&
              (task.type === "project" ? (
                <div style={{ width: columnWidths.wbsId }}></div>
              ) : (
                <div
                  className="flex flex-col items-center justify-center h-full border-l"
                  style={{ width: columnWidths.wbsId }}
                >
                  {task.id}
                </div>
              ))}

            {/* 担当 */}
            {columnVisibility.assignee && (
              <div
                className="flex flex-col items-center justify-center h-full border-l"
                style={{ width: columnWidths.tanto }}
              >
                {task.assignee}
              </div>
            )}

            {/* 開始日 */}
            {columnVisibility.yotei && (
              <div
                className="flex flex-col items-center justify-center h-full border-l"
                style={{ width: columnWidths.start }}
              >
                <div>{task.start?.toLocaleDateString("ja-JP")}</div>
              </div>
            )}

            {/* 終了日 */}
            {columnVisibility.yotei && (
              <div
                className="flex flex-col items-center justify-center h-full border-l"
                style={{ width: columnWidths.end }}
              >
                <div>{task.end?.toLocaleDateString("ja-JP")}</div>
              </div>
            )}

            {/* 工数 */}
            {columnVisibility.yotei && (
              <div
                style={{ width: columnWidths.kosu }}
                className="flex items-center justify-center h-full border-l"
              >
                {task.kosu}
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
            <div style={{ width: columnWidths.status }}>
              <button
                onClick={() => handleTaskDelete(task)}
                className="text-red-500"
              >
                <Trash2 className="w-4 h-4" />
              </button>
              <EditDialog task={task}>
                <Pencil className="w-4 h-4" />
              </EditDialog>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const handleTaskChange = (task: Task) => {
    console.log("On date change Id:" + task.id);
    console.log(task);
    // let newTasks = tasks.map((t) => (t.id === task.id ? task : t));
    // if (task.project) {
    //   const [start, end] = getStartEndDateForProject(newTasks, task.project);
    //   const project =
    //     newTasks[newTasks.findIndex((t) => t.id === task.project)];
    //   if (
    //     project.start.getTime() !== start.getTime() ||
    //     project.end.getTime() !== end.getTime()
    //   ) {
    //     const changedProject = { ...project, start, end };
    //     newTasks = newTasks.map((t) =>
    //       t.id === task.project ? changedProject : t
    //     );
    //   }
    // }
    setTasks(tasks);
  };

  const handleTaskEdit = (task: Task) => {
    console.log("On date change Id:" + task.id);
    console.log(task);

    // Display the edit dialog here
    const newTaskName = prompt("Edit task name:", task.name);
    if (newTaskName !== null) {
      const newTask = { ...task, name: newTaskName };
      setTasks(tasks.map((t) => (t.id === task.id ? newTask : t)));
    }
  };

  const handleTaskDelete = (task: Task) => {
    const conf = window.confirm(
      `このタスクを本当に削除しますか？ \n\n ${task.name + " " + task.id}`
    );
    if (conf) {
      setTasks(tasks.filter((t) => t.id !== task.id));
    }
    return conf;
  };

  const handleDblClick = (task: Task) => {
    alert("On Double Click event Id:" + task.id);
  };

  return (
    <div className="container mx-auto">
      <div className="flex justify-center gap-2">
        <Button onClick={() => setViewMode(ViewMode.Year)}>年</Button>
        <Button onClick={() => setViewMode(ViewMode.Month)}>月</Button>
        <Button onClick={() => setViewMode(ViewMode.Week)}>週</Button>
        <Button onClick={() => setViewMode(ViewMode.Day)}>日</Button>
        <Button onClick={() => setViewMode(ViewMode.Hour)}>時</Button>
        <Button onClick={() => setViewMode(ViewMode.QuarterDay)}>4時間</Button>
        <Button onClick={() => setViewMode(ViewMode.HalfDay)}>8時間</Button>

        <Button onClick={() => setIsTalebeHide(!isTalebeHide)}>
          {isTalebeHide ? "表示" : "非表示"}
        </Button>
      </div>
      <ColumnVisibilityToggle
        columnVisibility={columnVisibility}
        onToggle={handleColumnVisibilityToggle}
      />
      <Gantt
        tasks={tasks}
        viewMode={viewMode}
        viewDate={new Date()}
        listCellWidth={isTalebeHide ? "100" : ""}
        // fontSize="10px"
        rowHeight={45}
        barCornerRadius={5}
        barFill={95}
        preStepsCount={100}
        locale="ja-JP"
        TaskListHeader={TaskListHeader}
        TaskListTable={TaskListTable}
        onDateChange={handleTaskChange}
        onDelete={handleTaskDelete}
        onDoubleClick={handleDblClick}
      />
    </div>
  );
}
