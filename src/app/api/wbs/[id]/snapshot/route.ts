/**
 * WBS手動スナップショット作成API
 */

import { NextRequest, NextResponse } from 'next/server';
import { container } from '@/lib/inversify.config';
import { SYMBOL } from '@/types/symbol';
import type { IProgressHistoryApplicationService } from '@/applications/wbs-progress-history/progress-history-application-service';

export async function POST(
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

    const body = await request.json();
    const { snapshotName } = body;

    const progressHistoryService = container.get<IProgressHistoryApplicationService>(
      SYMBOL.IProgressHistoryApplicationService
    );

    const snapshot = await progressHistoryService.createSnapshot(wbsId, snapshotName);

    return NextResponse.json({
      id: snapshot.id,
      recordedAt: snapshot.recordedAt.toISOString(),
      recordType: snapshot.recordType,
      snapshotName: snapshot.snapshotName,
      totalTaskCount: snapshot.totalTaskCount,
      completedCount: snapshot.completedCount,
      inProgressCount: snapshot.inProgressCount,
      notStartedCount: snapshot.notStartedCount,
      completionRate: snapshot.completionRate,
      plannedManHours: snapshot.plannedManHours,
      actualManHours: snapshot.actualManHours,
      varianceManHours: snapshot.varianceManHours,
    });
  } catch (error) {
    console.error('Failed to create snapshot:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal Server Error' },
      { status: 500 }
    );
  }
}