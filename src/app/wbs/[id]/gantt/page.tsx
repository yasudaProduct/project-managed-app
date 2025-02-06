import React from "react";
import { getWbsById } from "../wbs-actions";
import GanttComponent from "@/components/gannt/gantt";
import { Task } from "gantt-task-react";
import { notFound } from "next/navigation";
import { getTaskAll } from "../wbs-task-actions";
import { WbsTask } from "@/types/wbs";

// const tasks: Task[] = [
//   {
//     start: new Date(2020, 1, 1),
//     end: new Date(2020, 1, 2),
//     name: "Idea",
//     id: "Task 0",
//     type: "task",
//     progress: 45,
//     isDisabled: true,
//     styles: { progressColor: "#ffbb54", progressSelectedColor: "#ff9e0d" },
//   },
// ];

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

  const tasks: Task[] = wbsTasks.map((task) => ({
    id: task.id,
    type: "task",
    name: task.name,
    start: task.periods?.[0]?.startDate ?? new Date(),
    end: task.periods?.[0]?.endDate ?? new Date(),
    progress: 0,
    project: wbs.name,
  }));

  return (
    <div className="container mx-auto">
      <div className="flex justify-between items-center mb-2">
        <h1 className="text-3xl font-bold">WBS: {wbs.name}</h1>
      </div>
      <GanttComponent tasks={tasks} wbs={wbs} />
    </div>
  );
}
