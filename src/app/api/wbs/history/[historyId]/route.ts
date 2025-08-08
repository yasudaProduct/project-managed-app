/**
 * WBS進捗履歴詳細取得API
 */

import { NextRequest, NextResponse } from 'next/server';
import { container } from '@/lib/inversify.config';
import { SYMBOL } from '@/types/symbol';
import type { IProgressHistoryApplicationService } from '@/applications/wbs-progress-history/progress-history-application-service';
import logger from '@/lib/logger'
import { withRequestContext } from '@/lib/api-handler'

export const GET = withRequestContext(async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ historyId: string }> }
) {
  try {
    const { historyId: historyIdStr } = await params;
    const historyId = parseInt(historyIdStr);
    if (isNaN(historyId)) {
      return NextResponse.json(
        { error: 'Invalid history ID' },
        { status: 400 }
      );
    }

    const progressHistoryService = container.get<IProgressHistoryApplicationService>(
      SYMBOL.IProgressHistoryApplicationService
    );

    const history = await progressHistoryService.getProgressHistoryById(historyId);

    if (!history) {
      return NextResponse.json(
        { error: 'Progress history not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      id: history.id,
      wbsId: history.wbsId,
      recordedAt: history.recordedAt.toISOString(),
      recordType: history.recordType,
      snapshotName: history.snapshotName,
      totalTaskCount: history.totalTaskCount,
      completedCount: history.completedCount,
      inProgressCount: history.inProgressCount,
      notStartedCount: history.notStartedCount,
      completionRate: history.completionRate,
      plannedManHours: history.plannedManHours,
      actualManHours: history.actualManHours,
      varianceManHours: history.varianceManHours,
      metadata: history.metadata,
      taskHistories: history.taskHistories?.map(taskHistory => ({
        id: taskHistory.id,
        taskId: taskHistory.taskId,
        taskNo: taskHistory.taskNo,
        taskName: taskHistory.taskName,
        status: taskHistory.status,
        assigneeId: taskHistory.assigneeId,
        assigneeName: taskHistory.assigneeName,
        phaseId: taskHistory.phaseId,
        phaseName: taskHistory.phaseName,
        plannedStartDate: taskHistory.plannedStartDate?.toISOString(),
        plannedEndDate: taskHistory.plannedEndDate?.toISOString(),
        actualStartDate: taskHistory.actualStartDate?.toISOString(),
        actualEndDate: taskHistory.actualEndDate?.toISOString(),
        plannedManHours: taskHistory.plannedManHours,
        actualManHours: taskHistory.actualManHours,
        progressRate: taskHistory.progressRate,
      })) || [],
      createdAt: history.createdAt?.toISOString(),
      updatedAt: history.updatedAt?.toISOString(),
    });
  } catch (error) {
    logger.error({ err: error }, 'Failed to get progress history detail');
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
})