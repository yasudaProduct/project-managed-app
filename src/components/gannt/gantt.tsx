"use client";

import { Wbs } from "@/types/wbs";
import { Gantt, Task, ViewMode } from "gantt-task-react";
import "gantt-task-react/dist/index.css";
import { Button } from "../ui/button";
import { useState } from "react";
import {
  ColumnVisibility,
  ColumnVisibilityToggle,
} from "./column-visibility-toggle";

interface GanttComponentProps {
  tasks: Task[];
  wbs: Wbs;
}

export default function GanttComponent({ tasks, wbs }: GanttComponentProps) {
  const [viewMode, setViewMode] = useState<ViewMode>(ViewMode.Day);
  const [isTalebeHide, setIsTalebeHide] = useState(true);
  const [columnVisibility, setColumnVisibility] = useState<ColumnVisibility>({
    wbsno: true,
    tanto: true,
    start: true,
    end: true,
    kosu: true,
    status: true,
  });

  const handleColumnVisibilityToggle = (column: keyof ColumnVisibility) => {
    setColumnVisibility((prev) => ({ ...prev, [column]: !prev[column] }));
  };

  const columnWidths = {
    task: "100px",
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
  }> = ({ headerHeight }) => {
    return (
      <div
        className="flex items-center gap-4 px-4 bg-gray-100 font-semibold text-sm text-gray-700"
        style={{ height: headerHeight }}
      >
        <div style={{ width: columnWidths.task }}>タスク名</div>
        {/* {columnVisibility.wbsno && (
          <div
            className="flex items-center justify-center h-full"
            style={{ width: columnWidths.wbsId }}
          >
            WBSNO
          </div>
        )}
        {columnVisibility.tanto && (
          <div
            className="flex items-center justify-center h-full"
            style={{ width: columnWidths.tanto }}
          >
            担当
          </div>
        )} */}
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
        {/* {columnVisibility.kosu && (
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
        )} */}
      </div>
    );
  };

  return (
    <div className="container mx-auto">
      <Gantt
        tasks={tasks}
        viewMode={viewMode}
        viewDate={new Date()}
        listCellWidth={isTalebeHide ? "100" : ""}
        fontSize="10px"
        rowHeight={45}
        barCornerRadius={5}
        barFill={95}
        preStepsCount={100}
        locale="ja-JP"
        TaskListHeader={TaskListHeader}
      />
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
    </div>
  );
}
