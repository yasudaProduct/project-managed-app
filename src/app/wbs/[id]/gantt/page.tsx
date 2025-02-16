import React from "react";
import { getWbsById } from "../wbs-actions";
import GanttComponent from "@/components/gannt/gantt";
import { Task } from "gantt-task-react";
import { notFound } from "next/navigation";
import { getTaskAll } from "../wbs-task-actions";
import { WbsTask } from "@/types/wbs";

export default async function GanttPage({
  params,
}: {
  params: { id: string };
}) {
  const { id } = await params;
  const wbs = await getWbsById(parseInt(id));
  if (!wbs) {
    notFound();
  }

  const wbsTasks: WbsTask[] = await getTaskAll(wbs.id);

  const tasks: Task[] = formatGanttTasks(wbsTasks);
  // const tasks: Task[] = wbsTasks.map((task) => {
  //   return {
  //     id: task.id,
  //     type: "task",
  //     name: task.name,
  //     assignee: {
  //       id: task.assignee?.id ?? "",
  //       name: task.assignee?.displayName ?? "-",
  //     },
  //     phase: {
  //       id: task.phase?.id ?? 0,
  //       name: task.phase?.name ?? "-",
  //       seq: task.phase?.seq ?? 0,
  //     },
  //     yoteiStart: task.yoteiStart ?? undefined,
  //     yoteiEnd: task.yoteiEnd ?? undefined,
  //     yoteiKosu: task.yoteiKosu ?? 0,
  //     status: task.status,
  //     progress: 0,
  //     project: wbs.name,
  //     // ⇩GanttComponentで必須の可能性があるため、デフォルト値を設定
  //     start: new Date(),
  //     end: new Date(),
  //   };
  // });

  // GanttComponentで表示するためのタスクを作成する
  function formatGanttTasks(wbsTasks: WbsTask[]): Task[] {
    const ganttTasks: Task[] = [];

    // WbsTaskを変換
    wbsTasks.forEach((task) => {
      ganttTasks.push({
        id: task.id,
        type: "task",
        name: task.name,
        assignee: {
          id: task.assignee?.id ?? "",
          name: task.assignee?.displayName ?? "-",
        },
        phase: {
          id: task.phase?.id ?? 0,
          name: task.phase?.name ?? "-",
          seq: task.phase?.seq ?? 0,
        },
        yoteiStart: task.yoteiStart ?? undefined,
        yoteiEnd: task.yoteiEnd ?? undefined,
        yoteiKosu: task.yoteiKosu ?? 0,
        status: task.status,
        progress: 0,
        project: task.phase?.name ?? "-",
        // ⇩GanttComponentで必須の可能性があるため、デフォルト値を設定
        start: new Date(),
        end: new Date(),
      });
    });

    // 工程を抽出
    const uniquePhases = Array.from(
      new Map(wbsTasks.map((task) => [task.phase?.id, task.phase])).values()
    );

    // 工程を追加
    uniquePhases.forEach((phase) => {
      ganttTasks.push({
        id: phase?.name ?? "-",
        type: "project",
        name: "-",
        assignee: {
          id: "",
          name: "-",
        },
        phase: {
          id: phase?.id ?? 0,
          name: phase?.name ?? "-",
          seq: phase?.seq ?? 0,
        },
        yoteiStart: new Date(),
        yoteiEnd: new Date(),
        yoteiKosu: 0,
        status: "NOT_STARTED",
        progress: 0,
        hideChildren: false,
        start: new Date(),
        end: new Date(),
      });
    });

    ganttTasks.sort((a, b) => {
      if (a.phase.id !== b.phase.id) {
        return a.phase.seq - b.phase.seq; // 工程のseqでソート
      }
      if (a.type === "project" && b.type === "task") {
        return -1; // 工程が先頭に来るようにソート
      }
      if (a.type === "task" && b.type === "project") {
        return 1; // タスクが末尾に来るようにソート
      }
      return a.id.localeCompare(b.id); // タスクのidでソート
    });

    return ganttTasks;
  }

  return (
    <div className="container mx-auto">
      <div className="flex justify-between items-center mb-2">
        <h1 className="text-3xl font-bold">WBS: {wbs.name}</h1>
      </div>
      <GanttComponent tasks={tasks} wbs={wbs} />
    </div>
  );
}
