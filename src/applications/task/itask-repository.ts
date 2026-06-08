import { Task } from "../../domains/task/task";

/** 差分同期の照合用の軽量な同期状態（フルドメインを組まない） */
interface TaskSyncState {
    id: number;
    taskNo: string;
    isDeleted: boolean;
}

/** 差分同期で適用するバケット */
interface SyncDiffBuckets {
    toCreate: Task[];        // 新規（id無し）
    toUpdate: Task[];        // 存続/復活（id保持。reviveはisDeleted解除で内包）
    toSoftDeleteIds: number[]; // 消失（論理削除する有効タスクのid）
}

/** 進捗スナップショットの1タスク分の入力（時点データ・自己完結） */
interface TaskProgressSnapshotInput {
    /** 既存タスクは id を指定。新規タスクは null（create後に taskNo で解決される） */
    taskId: number | null;
    taskNo: string;
    progressRate: number | null;
    status: string;           // TaskStatus
    plannedManHours: number;
    baseManHours: number;
    costPerHour: number;
    plannedStart: Date | null;
    plannedEnd: Date | null;
    baseStart: Date | null;
    baseEnd: Date | null;
    actualStart: Date | null;
    actualEnd: Date | null;
    isRemoved: boolean;
}

/** SyncLog の書き込みデータ（tx内採番用） */
interface SyncLogData {
    projectId: string;
    syncStatus: 'SUCCESS' | 'FAILED' | 'PARTIAL';
    syncedAt: Date;
    recordCount: number;
    addedCount: number;
    updatedCount: number;
    deletedCount: number;
}

/** applySyncDiff にスナップショット記録を行わせる場合の文脈 */
interface SyncDiffContext {
    syncLogData: SyncLogData;
    snapshotInputs: TaskProgressSnapshotInput[];
    snapshotAt: Date;
}

interface ITaskRepository {
    findById(id: number): Promise<Task | null>;
    findAll(wbsId?: number): Promise<Task[]>;
    findByWbsId(wbsId: number): Promise<Task[]>;
    /** 有効タスクのみ（論理削除を除外） */
    findActiveByWbsId(wbsId: number): Promise<Task[]>;
    /** 論理削除済みを含む全タスク（sync照合・replaceAll全削除用） */
    findIncludingDeletedByWbsId(wbsId: number): Promise<Task[]>;
    /** 差分照合用の軽量な同期状態（id/taskNo/isDeletedのみ、論理削除込み） */
    findSyncStateByWbsId(wbsId: number): Promise<TaskSyncState[]>;
    findTasksByPeriod(startDate: Date, endDate: Date): Promise<Task[]>;
    create(task: Task): Promise<Task>;
    update(wbsId: number, task: Task): Promise<Task>;
    /**
     * 差分（作成/更新+revive/論理削除）を単一トランザクションで適用する。
     * context を渡すと、同一tx内で SyncLog を採番しスナップショットも記録し、採番した syncLogId を返す。
     */
    applySyncDiff(
        wbsId: number,
        buckets: SyncDiffBuckets,
        now: Date,
        context?: SyncDiffContext
    ): Promise<{ syncLogId: number | null }>;
    delete(id: number): Promise<void>;
}

export type {
    ITaskRepository,
    TaskSyncState,
    SyncDiffBuckets,
    TaskProgressSnapshotInput,
    SyncLogData,
    SyncDiffContext,
};