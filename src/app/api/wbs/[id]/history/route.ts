/**
 * WBS進捗履歴取得API
 */

import { NextRequest, NextResponse } from 'next/server';
import { container } from '@/lib/inversify.config';
import { SYMBOL } from '@/types/symbol';
import type { IProgressHistoryApplicationService } from '@/applications/wbs-progress-history/progress-history-application-service';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const wbsId = parseInt(id);
    if (isNaN(wbsId)) {
      return NextResponse.json(
        { error: 'Invalid WBS ID' },
        { status: 400 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const recordType = searchParams.get('recordType') || undefined;
    const startDate = searchParams.get('startDate') ? new Date(searchParams.get('startDate')!) : undefined;
    const endDate = searchParams.get('endDate') ? new Date(searchParams.get('endDate')!) : undefined;

    const progressHistoryService = container.get<IProgressHistoryApplicationService>(
      SYMBOL.IProgressHistoryApplicationService
    );

    const options = {
      limit,
      offset: (page - 1) * limit,
      recordType: recordType as 'AUTO' | 'MANUAL_SNAPSHOT' | undefined,
      startDate,
      endDate,
    };

    const [histories, total] = await Promise.all([
      progressHistoryService.getProgressHistories(wbsId, options),
      progressHistoryService.getProgressHistoryCount(wbsId, {
        recordType: recordType as 'AUTO' | 'MANUAL_SNAPSHOT' | undefined,
        startDate,
        endDate,
      }),
    ]);

    return NextResponse.json({
      histories: histories.map(history => ({
        id: history.id,
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
        taskHistoriesCount: history.taskHistories?.length || 0,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Failed to get progress histories:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}