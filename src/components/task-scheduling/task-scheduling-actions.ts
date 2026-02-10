"use server";

import { container } from "@/lib/inversify.config";
import { SYMBOL } from "@/types/symbol";
import { ITaskSchedulingApplicationService } from "@/applications/task-scheduling/itask-scheduling-application.service";
import { TaskSchedulingResult } from "@/applications/task-scheduling/task-scheduling-application.service";

export async function calculateTaskSchedules(wbsId: number | string): Promise<TaskSchedulingResult[]> {
  const taskSchedulingService = container.get<ITaskSchedulingApplicationService>(
    SYMBOL.ITaskSchedulingApplicationService
  );

  const idNum = typeof wbsId === "string" ? Number(wbsId) : wbsId;
  if (Number.isNaN(idNum)) {
    throw new Error("Invalid wbsId");
  }

  return await taskSchedulingService.calculateWbsTaskSchedules(idNum);
}