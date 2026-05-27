"use server";

import { container } from "@/lib/inversify.config";
import { SYMBOL } from "@/types/symbol";
import { ITaskSchedulingApplicationService } from "@/applications/task-scheduling/itask-scheduling-application.service";
import { TaskSchedulingResult, SchedulingMode } from "@/applications/task-scheduling/task-scheduling-application.service";
import type { IWbsAssigneeRepository } from "@/applications/wbs/iwbs-assignee-repository";

export interface CalculateTaskSchedulesParams {
  wbsId: number | string;
  mode?: SchedulingMode;
  rescheduleBaseDate?: string; // ISO 8601 文字列（Server Action経由のためDate不可）
  assigneeStartDates?: Array<{ assigneeId: number; startDate: string }>; // Map非対応のため配列
}

export async function calculateTaskSchedules(
  params: CalculateTaskSchedulesParams | number | string
): Promise<TaskSchedulingResult[]> {
  const taskSchedulingService = container.get<ITaskSchedulingApplicationService>(
    SYMBOL.ITaskSchedulingApplicationService
  );

  // 後方互換: 数値/文字列で呼ばれた場合
  if (typeof params === "number" || typeof params === "string") {
    const idNum = typeof params === "string" ? Number(params) : params;
    if (Number.isNaN(idNum)) {
      throw new Error("Invalid wbsId");
    }
    return await taskSchedulingService.calculateWbsTaskSchedules(idNum);
  }

  const idNum = typeof params.wbsId === "string" ? Number(params.wbsId) : params.wbsId;
  if (Number.isNaN(idNum)) {
    throw new Error("Invalid wbsId");
  }

  const assigneeStartDates = params.assigneeStartDates
    ? new Map(params.assigneeStartDates.map(a => [a.assigneeId, new Date(a.startDate)]))
    : undefined;

  return await taskSchedulingService.calculateWbsTaskSchedules(idNum, {
    mode: params.mode,
    rescheduleBaseDate: params.rescheduleBaseDate ? new Date(params.rescheduleBaseDate) : undefined,
    assigneeStartDates,
  });
}

export interface SchedulingAssignee {
  id: number;
  name: string;
}

export async function getSchedulingAssignees(wbsId: number): Promise<SchedulingAssignee[]> {
  const repo = container.get<IWbsAssigneeRepository>(SYMBOL.IWbsAssigneeRepository);
  const assignees = await repo.findByWbsId(wbsId);
  return assignees.map(a => ({
    id: a.id!,
    name: a.userName ?? `担当者${a.id}`,
  }));
}
