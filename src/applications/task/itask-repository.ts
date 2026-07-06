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

/**
 * 手動編集（ガント・タスクモーダル等）でタスク更新/削除と同一トランザクションで
 * 進捗スナップショットを追記する文脈（syncLogId は null で記録される）
 */
interface ManualSnapshotContext {
    wbsId: number;
    input: TaskProgressSnapshotInput;
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
    /** 手動スナップショット用：対象タスクの直近スナップショットの実績日（無ければnull） */
    findLatestSnapshotActuals(taskId: number): Promise<{ actualStart: Date | null; actualEnd: Date | null } | null>;
    create(task: Task): Promise<Task>;
    /**
     * タスクを更新する。snapshot を渡すと同一トランザクションで
     * 進捗スナップショット（手動記録・syncLogId=null）を追記する。
     */
    update(wbsId: number, task: Task, snapshot?: ManualSnapshotContext): Promise<Task>;
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
    /**
     * 指定WBSのタスクを全置換（洗い替え）する。単一トランザクションで
     * 「全タスク削除＋進捗スナップショット履歴クリア＋新タスク作成」を原子的に行う。
     * 事前にドメイン検証済みのtasksを渡すこと（部分置換を起こさないため）。
     */
    replaceAllTasks(wbsId: number, tasks: Task[]): Promise<{ deleted: number; added: number }>;
    /**
     * タスクを削除する。tombstone を渡すと同一トランザクションで
     * tombstoneスナップショット（isRemoved=true）を追記し、削除後もEVM履歴の整合を保つ。
     */
    delete(id: number, tombstone?: ManualSnapshotContext): Promise<void>;
}

export type {
    ITaskRepository,
    TaskSyncState,
    SyncDiffBuckets,
    TaskProgressSnapshotInput,
    SyncLogData,
    SyncDiffContext,
    ManualSnapshotContext,
};