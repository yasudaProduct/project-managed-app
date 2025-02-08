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

export default function GanttComponent({ tasks }: GanttComponentProps) {
  const [viewMode, setViewMode] = useState<ViewMode>(ViewMode.Day);
  const [isTalebeHide, setIsTalebeHide] = useState(true);
  const [columnVisibility, setColumnVisibility] = useState<ColumnVisibility>({
    wbsno: true,
    assignee: true,
    start: true,
    end: true,
    kosu: true,
    status: true,
  });

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
        {columnVisibility.start && (
          <div
            className="flex items-center justify-center h-full"
            style={{ width: columnWidths.start }}
          >
            開始日
          </div>
        )}
        {columnVisibility.end && (
          <div
            className="flex items-center justify-center h-full"
            style={{ width: columnWidths.end }}
          >
            終了日
          </div>
        )}
        {columnVisibility.kosu && (
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
                  className="_2QjE6"
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
                <div style={{ width: columnWidths.wbsId }}>{task.id}</div>
              ))}

            {/* 担当 */}
            {columnVisibility.assignee && (
              <div style={{ width: columnWidths.tanto }}>{task.assignee}</div>
            )}

            {/* 開始日 */}
            {columnVisibility.start && (
              <div
                className="flex flex-col items-center justify-center h-full border-l"
                style={{ width: columnWidths.start }}
              >
                <div>{task.start?.toLocaleDateString("ja-JP")}</div>
              </div>
            )}

            {/* 終了日 */}
            {columnVisibility.end && (
              <div
                className="flex flex-col items-center justify-center h-full border-l"
                style={{ width: columnWidths.end }}
              >
                <div>{task.end?.toLocaleDateString("ja-JP")}</div>
              </div>
            )}

            {/* 工数 */}
            {columnVisibility.kosu && (
              <div style={{ width: columnWidths.kosu }}>{task.kosu}</div>
            )}

            {/* 状況 */}
            {columnVisibility.status && (
              <div style={{ width: columnWidths.status }}>
                {getTaskStatusName(task.status)}
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="container mx-auto">
      <div className="flex justify-center gap-2">
        <Button onClick={() => setViewMode(ViewMode.Month)}>月</Button>
        <Button onClick={() => setViewMode(ViewMode.Day)}>日</Button>
        <Button onClick={() => setViewMode(ViewMode.Week)}>週</Button>
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
      />
    </div>
  );
}
