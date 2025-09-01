'use server';

import { container } from '@/lib/inversify.config';
import { SYMBOL } from '@/types/symbol';
import { IAssigneeGanttService } from '@/applications/assignee-gantt/iassignee-gantt.service';

// Server Actionの戻り値用の型定義
export interface WorkloadData {
  assigneeId: string;
  assigneeName: string;
  dailyAllocations: {
    date: string;
    availableHours: number;
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
  startDate: string,
  endDate: string
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

    // データを取得
    const workloads = await assigneeGanttService.getAssigneeWorkloads(
      wbsId,
      new Date(startDate),
      new Date(endDate)
    );

    // プレーンオブジェクトに変換
    const plainWorkloads: WorkloadData[] = workloads.map(workload => ({
      assigneeId: workload.assigneeId,
      assigneeName: workload.assigneeName,
      dailyAllocations: workload.dailyAllocations.map(daily => ({
        date: daily.date.toISOString(),
        availableHours: daily.availableHours,
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