'use server';

import { z } from 'zod';
import { container } from '@/lib/inversify.config';
import { SYMBOL } from '@/types/symbol';
import type { ICrossWbsWorkloadService } from '@/applications/cross-wbs-workload/icross-wbs-workload-service';
import type { TargetWbsInfo } from '@/applications/cross-wbs-workload/itarget-wbs-query-repository';
import { toWorkloadData } from '@/applications/assignee-gantt/workload-data-mapper';
import type { AssigneeGanttResponse } from '@/applications/assignee-gantt/workload-data';

const ymdSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const getCrossProjectAssigneeWorkloadsSchema = z.object({
  startDate: ymdSchema,
  endDate: ymdSchema,
});

/**
 * プロジェクト横断の担当者別作業負荷を取得する。
 * 対象: 未開始・進行中プロジェクトの最新WBS。ユーザー単位に合算済み。
 */
export async function getCrossProjectAssigneeWorkloads(
  startDate: string, // YYYY-MM-DD を想定
  endDate: string // YYYY-MM-DD を想定
): Promise<AssigneeGanttResponse> {
  try {
    const parsed = getCrossProjectAssigneeWorkloadsSchema.safeParse({ startDate, endDate });
    if (!parsed.success) {
      return {
        success: false,
        error: 'startdate、enddateはYYYY-MM-DD形式で指定してください'
      };
    }

    // YYYY-MM-DD をUTC深夜に変換してサービスへ
    const toUtcMidnight = (ymd: string) => new Date(`${ymd}T00:00:00.000Z`);

    const service = container.get<ICrossWbsWorkloadService>(SYMBOL.ICrossWbsWorkloadService);
    const workloads = await service.getCrossProjectUserWorkloads(
      toUtcMidnight(parsed.data.startDate),
      toUtcMidnight(parsed.data.endDate)
    );

    return {
      success: true,
      data: workloads.map(workload => toWorkloadData(workload)),
      // 実現不可能タスク警告はWBS単位の概念のため横断ページでは扱わない
      warnings: []
    };
  } catch (error) {
    if (process.env.NODE_ENV !== 'test') {
      console.error('CrossProjectAssigneeGantt Server Action Error:', error);
    }
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Internal Server Error'
    };
  }
}

/** 横断負荷計算の対象WBS(未開始・進行中プロジェクトの最新WBS)一覧を取得する */
export async function getTargetWbsList(): Promise<TargetWbsInfo[]> {
  const service = container.get<ICrossWbsWorkloadService>(SYMBOL.ICrossWbsWorkloadService);
  return service.resolveTargetWbs();
}
