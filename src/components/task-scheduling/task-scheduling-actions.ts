"use server";

import { container } from "@/lib/inversify.config";
import { SYMBOL } from "@/types/symbol";
import { ITaskSchedulingApplicationService } from "@/applications/task-scheduling/itask-scheduling-application.service";
import { TaskSchedulingResult } from "@/domains/task-scheduling/task-scheduling.service";

export async function calculateTaskSchedules(wbsId: number): Promise<TaskSchedulingResult[]> {
  const taskSchedulingService = container.get<ITaskSchedulingApplicationService>(
    SYMBOL.ITaskSchedulingApplicationService
  );
  
  return await taskSchedulingService.calculateWbsTaskSchedules(wbsId);
}