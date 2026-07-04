'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { container } from '@/lib/inversify.config';
import { SYMBOL } from '@/types/symbol';
import { EvmService } from '@/applications/evm/evm-service';
import type { TaskStatus } from '@/types/wbs';

const evmService = container.get<EvmService>(SYMBOL.EvmService);

// 進捗スナップショット訂正画面用のシリアライズ済みレコード
export type EditableProgressSnapshotData = {
  id: number;
  taskId: number;
  taskNo: string;
  taskName: string;
  snapshotAt: string; // ISO 8601 string
  progressRate: number | null;
  status: TaskStatus;
};

export type ProgressHistoryActionResult<T = unknown> = {
  success: boolean;
  error?: string;
  data?: T;
};

const GetEditableSnapshotsSchema = z.object({
  wbsId: z.number(),
});

const UpdateSnapshotSchema = z.object({
  wbsId: z.number(),
  id: z.number(),
  progressRate: z.number().min(0).max(100).nullable(),
  status: z.enum(["NOT_STARTED", "IN_PROGRESS", "COMPLETED", "ON_HOLD"]),
});

/**
 * 訂正画面用：編集対象スナップショット一覧を取得
 */
export async function getEditableProgressSnapshots(
  params: z.infer<typeof GetEditableSnapshotsSchema>
): Promise<ProgressHistoryActionResult<EditableProgressSnapshotData[]>> {
  try {
    const validated = GetEditableSnapshotsSchema.parse(params);

    const snapshots = await evmService.getEditableProgressSnapshots(
      validated.wbsId
    );

    return {
      success: true,
      data: snapshots.map((s) => ({
        id: s.id,
        taskId: s.taskId,
        taskNo: s.taskNo,
        taskName: s.taskName,
        snapshotAt: s.snapshotAt.toISOString(),
        progressRate: s.progressRate,
        status: s.status,
      })),
    };
  } catch (error) {
    console.error('Failed to get editable progress snapshots:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * 訂正画面用：1件のスナップショットの progressRate / status を更新
 */
export async function updateProgressSnapshot(
  params: z.infer<typeof UpdateSnapshotSchema>
): Promise<ProgressHistoryActionResult> {
  try {
    const validated = UpdateSnapshotSchema.parse(params);

    await evmService.updateProgressSnapshot(
      validated.id,
      validated.progressRate,
      validated.status
    );

    // 訂正は過去EVへ反映されるため、訂正画面とEVMダッシュボードを再検証
    revalidatePath(`/wbs/${validated.wbsId}/progress-history`);
    revalidatePath(`/wbs/${validated.wbsId}/dashboard`);
    revalidatePath(`/wbs/${validated.wbsId}`);

    return { success: true };
  } catch (error) {
    console.error('Failed to update progress snapshot:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
