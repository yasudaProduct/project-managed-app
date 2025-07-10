"use client";

import React from "react";
import { useRouter } from "next/navigation";
import GanttV2Component from "./gantt-v2";
import { WbsTask, Milestone } from "@/types/wbs";
import { Project } from "@/types/project";

interface GanttV2WrapperProps {
  tasks: WbsTask[];
  milestones: Milestone[];
  project: Project;
  wbsId: number;
}

export default function GanttV2Wrapper({
  tasks,
  milestones,
  project,
  wbsId,
}: GanttV2WrapperProps) {
  const router = useRouter();

  const handleTaskUpdate = () => {
    // ページをリフレッシュしてデータを再取得
    router.refresh();
  };

  return (
    <GanttV2Component
      tasks={tasks}
      milestones={milestones}
      project={project}
      wbsId={wbsId}
      onTaskUpdate={handleTaskUpdate}
    />
  );
}