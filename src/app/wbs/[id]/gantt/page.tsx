import React from "react";
import { getWbsById } from "../wbs-actions";
import GanttComponent from "@/components/gannt/gantt";
import { Task } from "gantt-task-react";
import { notFound } from "next/navigation";
import { getTaskAll } from "../wbs-task-actions";
import { Milestone, WbsTask } from "@/types/wbs";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { CalendarCheck, CirclePlus, Trello, Users } from "lucide-react";
import { TaskModal } from "@/components/wbs/task-modal";
import { getMilestones } from "../milistone/action";

export default async function GanttPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const wbs = await getWbsById(parseInt(id));
  if (!wbs) {
    notFound();
  }

  const wbsTasks: WbsTask[] = await getTaskAll(wbs.id);

  const milestones: Milestone[] = await getMilestones(wbs.id);

  const tasks: Task[] | null = formatGanttTasks(wbsTasks);

  // GanttComponentで表示するためのタスクを作成する
  function formatGanttTasks(wbsTasks: WbsTask[]): Task[] | null {
    if (wbsTasks.length === 0) {
      return null;
    }

    const ganttTasks: Task[] = [];

    const startDates: Record<number, Date> = {};
    const endDates: Record<number, Date> = {};

    // WbsTaskを変換
    wbsTasks.forEach((task) => {
      ganttTasks.push({
        id: task.id.toString(),
        taskNo: task.taskNo!,
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
        yoteiStart: task.yoteiStart ?? undefined, //TODO Gantt内ではstart,endを扱うので、yoteiStart,yoteiEndは不要？
        yoteiEnd: task.yoteiEnd ?? undefined,
        yoteiKosu: task.yoteiKosu ?? 0,
        status: task.status,
        progress: 0,
        project: task.phase?.name ?? "-",
        // GanttComponent表示用 必須のためデフォルト値を設定
        start: task.yoteiStart ?? new Date(),
        end: task.yoteiEnd ?? new Date(),
      });

      const phaseId = task.phase?.id ?? 0;

      if (phaseId && task.yoteiStart) {
        if (startDates[phaseId] === undefined) {
          startDates[phaseId] = task.yoteiStart;
        } else {
          if (task.yoteiStart < startDates[phaseId]) {
            startDates[phaseId] = task.yoteiStart;
          }
        }
      }

      if (phaseId && task.yoteiEnd) {
        if (endDates[phaseId] === undefined) {
          endDates[phaseId] = task.yoteiEnd;
        } else {
          if (task.yoteiEnd > endDates[phaseId]) {
            endDates[phaseId] = task.yoteiEnd;
          }
        }
      }
    });

    // 工程を抽出
    const uniquePhases = Array.from(
      new Map(wbsTasks.map((task) => [task.phase?.id, task.phase])).values()
    );

    // 工程を追加
    uniquePhases.forEach((phase) => {
      ganttTasks.push({
        id: "project-" + phase!.id.toString(),
        taskNo: phase?.name ?? "-",
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
        yoteiStart: phase && startDates[phase.id],
        yoteiEnd: phase && endDates[phase.id],
        yoteiKosu: 0,
        status: "NOT_STARTED", //TODO 工程の全タスクが完了してたら完了にする
        progress: 0,
        hideChildren: false,
        start: (phase && startDates[phase.id]) ?? new Date(),
        end: (phase && endDates[phase.id]) ?? new Date(),
      });
    });

    milestones.forEach((milestone) => {
      ganttTasks.push({
        id: "milestone-" + milestone.id.toString(),
        taskNo: milestone.name,
        type: "milestone",
        name: milestone.name,
        assignee: {
          id: "",
          name: "-",
        },
        phase: {
          id: 0,
          name: "M",
          seq: 0,
        },
        yoteiStart: milestone.date,
        yoteiEnd: milestone.date,
        yoteiKosu: 0,
        status: "NOT_STARTED",
        progress: 0,
        start: milestone.date,
        end: milestone.date,
      });
    });

    ganttTasks.sort((a, b) => {
      if (a.type === "milestone" && b.type === "task") {
        return -1; // タスクが先頭に来るようにソート
      }
      if (a.type === "task" && b.type === "milestone") {
        return 1; // タスクが末尾に来るようにソート
      }
      if (a.type === "milestone" && b.type === "milestone") {
        // マイルストーンの日付でソート
        return a.yoteiStart!.getTime() - b.yoteiStart!.getTime();
      }

      if (a.phase.id !== b.phase.id) {
        return a.phase.seq - b.phase.seq; // 工程のseqでソート
      }
      if (a.type === "project" && b.type === "task") {
        return -1; // 工程が先頭に来るようにソート
      }
      if (a.type === "task" && b.type === "project") {
        return 1; // タスクが末尾に来るようにソート
      }
      return a.taskNo.localeCompare(b.taskNo); // タスクのidでソート
    });

    return ganttTasks;
  }

  return (
    <div className="container mx-auto">
      <div className="flex justify-between items-center mb-2">
        <h1 className="text-xl font-bold">ガントチャート: {wbs.name}</h1>
      </div>
      <div className="flex justify-start">
        <Link href={`/wbs/${wbs.id}/phase/new`}>
          <Button className="bg-white text-black hover:bg-gray-200">
            <CirclePlus className="h-4 w-4" />
            <Trello className="h-4 w-4" />
          </Button>
        </Link>
        <Link href={`/wbs/${wbs.id}/assignee/new`}>
          <Button className="bg-white text-black ml-2 hover:bg-gray-200">
            <CirclePlus className="h-4 w-4" />
            <Users className="h-4 w-4" />
          </Button>
        </Link>
        <TaskModal wbsId={wbs.id}>
          <Button className="bg-white text-black ml-2 hover:bg-gray-200">
            <CirclePlus className="h-4 w-4" />
            <CalendarCheck className="h-4 w-4" />
          </Button>
        </TaskModal>
      </div>
      {tasks && tasks.length > 0 ? (
        <GanttComponent tasks={tasks} wbs={wbs} />
      ) : (
        <div className="w-full h-full flex justify-center items-center">
          <div className="text-center text-gray-500">タスクがありません</div>
        </div>
      )}
    </div>
  );
}
