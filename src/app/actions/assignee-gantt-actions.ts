'use server';

import { container } from '@/lib/inversify.config';
import { SYMBOL } from '@/types/symbol';
import { IAssigneeGanttService } from '@/applications/assignee-gantt/iassignee-gantt.service';

// Server Actionの戻り値用の型定義
export interface WorkloadData {
  assigneeId: string;
  assigneeName: string;
  assigneeRate: number;
  dailyAllocations: {
    date: string;
    availableHours: number;
    // サーバー計算済みフィールド
    allocatedHours: number;
    isOverloaded: boolean;
    utilizationRate: number;
    overloadedHours: number;
    isOverloadedByStandard: boolean;
    overloadedByStandardHours: number;
    // レート基準
    rateAllowedHours: number;
    isOverRateCapacity: boolean;
    overRateHours: number;
    isWeekend?: boolean;
    isCompanyHoliday?: boolean;
    userSchedules?: {
      title: string;
      startTime: string;
      endTime: string;
      durationHours: number;
    }[];
    taskAllocations: {
      taskId: string;
      taskName: string;
      allocatedHours: number;
    }[];
  }[];
}

export interface AssigneeGanttResponse {
  success: boolean;
  data?: WorkloadData[];
  error?: string;
}

export async function getAssigneeWorkloads(
  wbsId: number,
  startDate: string, // YYYY-MM-DD を想定
  endDate: string // YYYY-MM-DD を想定
): Promise<AssigneeGanttResponse> {
  try {
    // バリデーション
    if (!wbsId || !startDate || !endDate) {
      return {
        success: false,
        error: 'wbsId, startDate, endDate are required'
      };
    }

    // DIコンテナからサービスを取得
    const assigneeGanttService = container.get<IAssigneeGanttService>(SYMBOL.IAssigneeGanttService);

    // YYYY-MM-DD をUTC深夜に変換してサービスへ
    const toUtcMidnight = (ymd: string) => new Date(`${ymd}T00:00:00.000Z`);

    // データを取得
    const workloads = await assigneeGanttService.getAssigneeWorkloads(
      wbsId,
      toUtcMidnight(startDate),
      toUtcMidnight(endDate)
    );

    // プレーンオブジェクトに変換
    const plainWorkloads: WorkloadData[] = workloads.map(workload => ({
      assigneeId: workload.assigneeId,
      assigneeName: workload.assigneeName,
      assigneeRate: workload.assigneeRate,
      dailyAllocations: workload.dailyAllocations.map(daily => ({
        date: daily.date.toISOString(),
        availableHours: daily.availableHours,
        allocatedHours: daily.allocatedHours,
        isOverloaded: daily.isOverloaded(),
        utilizationRate: daily.getUtilizationRate(),
        overloadedHours: daily.getOverloadedHours(),
        isOverloadedByStandard: daily.allocatedHours > 7.5,
        overloadedByStandardHours: Math.max(0, daily.allocatedHours - 7.5),
        rateAllowedHours: daily.availableHours * workload.assigneeRate,
        isOverRateCapacity: daily.allocatedHours > (daily.availableHours * workload.assigneeRate),
        overRateHours: Math.max(0, daily.allocatedHours - (daily.availableHours * workload.assigneeRate)),
        isWeekend: daily.isWeekend,
        isCompanyHoliday: daily.isCompanyHoliday,
        userSchedules: daily.userSchedules,
        taskAllocations: daily.taskAllocations.map(task => ({
          taskId: task.taskId,
          taskName: task.taskName,
          allocatedHours: task.allocatedHours
        }))
      }))
    }));

    return {
      success: true,
      data: plainWorkloads
    };
  } catch (error) {
    if (process.env.NODE_ENV !== 'test') {
      console.error('AssigneeGantt Server Action Error:', error);
    }
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Internal Server Error'
    };
  }
}