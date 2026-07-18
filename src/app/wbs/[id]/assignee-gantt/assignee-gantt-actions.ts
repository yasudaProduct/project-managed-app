'use server';

import { z } from 'zod';
import { container } from '@/lib/inversify.config';
import { SYMBOL } from '@/types/symbol';
import { IAssigneeGanttService } from '@/applications/assignee-gantt/iassignee-gantt-service';
import type { ICrossWbsWorkloadService } from '@/applications/cross-wbs-workload/icross-wbs-workload-service';
import { toWorkloadData } from '@/applications/assignee-gantt/workload-data-mapper';
import type { AssigneeGanttResponse } from '@/applications/assignee-gantt/workload-data';

const ymdSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const getAssigneeWorkloadsSchema = z.object({
  wbsId: z.number().int().positive(),
  startDate: ymdSchema,
  endDate: ymdSchema,
  includeOtherWbs: z.boolean().optional(),
});

export async function getAssigneeWorkloads(
  wbsId: number,
  startDate: string, // YYYY-MM-DD を想定
  endDate: string, // YYYY-MM-DD を想定
  options?: { includeOtherWbs?: boolean }
): Promise<AssigneeGanttResponse> {
  try {
    // バリデーション
    const parsed = getAssigneeWorkloadsSchema.safeParse({
      wbsId,
      startDate,
      endDate,
      includeOtherWbs: options?.includeOtherWbs,
    });
    if (!parsed.success) {
      return {
        success: false,
        error: 'wbsid、startdate、enddateが必要です'
      };
    }

    const assigneeGanttService = container.get<IAssigneeGanttService>(SYMBOL.IAssigneeGanttService);

    // YYYY-MM-DD をUTC深夜に変換してサービスへ
    const toUtcMidnight = (ymd: string) => new Date(`${ymd}T00:00:00.000Z`);
    const start = toUtcMidnight(parsed.data.startDate);
    const end = toUtcMidnight(parsed.data.endDate);

    // 他WBS考慮ON時は横断サービスで他プロジェクトの負荷を合算、OFF時は従来通り現WBSのみ。
    // 警告(実現不可能タスク)はどちらのモードでも現WBSのみを対象とする。
    // 合算行は現WBS参画率のrateBasisを添えてDTO化し、Rバッジを「取り分超過」判定にする。
    const warningsPromise = assigneeGanttService.getAssigneeWarnings(parsed.data.wbsId, start, end);
    const dataPromise = parsed.data.includeOtherWbs
      ? container
        .get<ICrossWbsWorkloadService>(SYMBOL.ICrossWbsWorkloadService)
        .getWbsWorkloadsWithExternal(parsed.data.wbsId, start, end)
        .then(merged => merged.map(({ workload, rateBasis }) => toWorkloadData(workload, { rateBasis })))
      : assigneeGanttService
        .getAssigneeWorkloads(parsed.data.wbsId, start, end)
        .then(workloads => workloads.map(workload => toWorkloadData(workload)));
    const [data, warnings] = await Promise.all([dataPromise, warningsPromise]);

    return {
      success: true,
      data,
      warnings: warnings.map(w => ({
        taskId: w.taskId,
        taskNo: w.taskNo,
        taskName: w.taskName,
        assigneeId: w.assigneeId,
        assigneeName: w.assigneeName,
        periodStart: w.periodStart ? w.periodStart.toISOString() : undefined,
        periodEnd: w.periodEnd ? w.periodEnd.toISOString() : undefined,
        reason: w.reason
      }))
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
