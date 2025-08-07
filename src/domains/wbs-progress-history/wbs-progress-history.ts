/**
 * WBS進捗履歴ドメインモデル
 */

import { TaskProgressHistory } from './task-progress-history';

export enum RecordType {
  AUTO = 'AUTO',
  MANUAL_SNAPSHOT = 'MANUAL_SNAPSHOT',
}

export interface WbsProgressHistoryProps {
  id?: number;
  wbsId: number;
  recordedAt: Date;
  recordType: RecordType;
  snapshotName?: string;
  totalTaskCount: number;
  completedCount: number;
  inProgressCount: number;
  notStartedCount: number;
  completionRate: number;
  plannedManHours: number;
  actualManHours: number;
  varianceManHours: number;
  metadata?: Record<string, unknown>;
  taskHistories?: TaskProgressHistory[];
  createdAt?: Date;
  updatedAt?: Date;
}

export class WbsProgressHistory {
  private readonly _id?: number;
  private readonly _wbsId: number;
  private readonly _recordedAt: Date;
  private readonly _recordType: RecordType;
  private readonly _snapshotName?: string;
  private readonly _totalTaskCount: number;
  private readonly _completedCount: number;
  private readonly _inProgressCount: number;
  private readonly _notStartedCount: number;
  private readonly _completionRate: number;
  private readonly _plannedManHours: number;
  private readonly _actualManHours: number;
  private readonly _varianceManHours: number;
  private readonly _metadata?: Record<string, unknown>;
  private readonly _taskHistories?: TaskProgressHistory[];
  private readonly _createdAt?: Date;
  private readonly _updatedAt?: Date;

  constructor(props: WbsProgressHistoryProps) {
    this.validateProps(props);

    this._id = props.id;
    this._wbsId = props.wbsId;
    this._recordedAt = props.recordedAt;
    this._recordType = props.recordType;
    this._snapshotName = props.snapshotName;
    this._totalTaskCount = props.totalTaskCount;
    this._completedCount = props.completedCount;
    this._inProgressCount = props.inProgressCount;
    this._notStartedCount = props.notStartedCount;
    this._completionRate = props.completionRate;
    this._plannedManHours = props.plannedManHours;
    this._actualManHours = props.actualManHours;
    this._varianceManHours = props.varianceManHours;
    this._metadata = props.metadata;
    this._taskHistories = props.taskHistories;
    this._createdAt = props.createdAt;
    this._updatedAt = props.updatedAt;
  }

  private validateProps(props: WbsProgressHistoryProps): void {
    if (props.wbsId <= 0) {
      throw new Error('WBS IDは正の数である必要があります');
    }

    if (props.totalTaskCount < 0) {
      throw new Error('総タスク数は0以上である必要があります');
    }

    if (props.completedCount < 0) {
      throw new Error('完了タスク数は0以上である必要があります');
    }

    if (props.inProgressCount < 0) {
      throw new Error('進行中タスク数は0以上である必要があります');
    }

    if (props.notStartedCount < 0) {
      throw new Error('未着手タスク数は0以上である必要があります');
    }

    if (props.completionRate < 0 || props.completionRate > 100) {
      throw new Error('完了率は0から100の範囲である必要があります');
    }

    if (props.plannedManHours < 0) {
      throw new Error('予定工数は0以上である必要があります');
    }

    if (props.actualManHours < 0) {
      throw new Error('実績工数は0以上である必要があります');
    }

    // タスク数の整合性チェック
    const calculatedTotal = props.completedCount + props.inProgressCount + props.notStartedCount;
    if (calculatedTotal !== props.totalTaskCount) {
      throw new Error('タスク数の合計が一致しません');
    }

    // 手動スナップショットの場合はスナップショット名が必要
    if (props.recordType === RecordType.MANUAL_SNAPSHOT && !props.snapshotName) {
      throw new Error('手動スナップショットの場合、スナップショット名は必須です');
    }
  }

  // Getters
  get id(): number | undefined {
    return this._id;
  }

  get wbsId(): number {
    return this._wbsId;
  }

  get recordedAt(): Date {
    return this._recordedAt;
  }

  get recordType(): RecordType {
    return this._recordType;
  }

  get snapshotName(): string | undefined {
    return this._snapshotName;
  }

  get totalTaskCount(): number {
    return this._totalTaskCount;
  }

  get completedCount(): number {
    return this._completedCount;
  }

  get inProgressCount(): number {
    return this._inProgressCount;
  }

  get notStartedCount(): number {
    return this._notStartedCount;
  }

  get completionRate(): number {
    return this._completionRate;
  }

  get plannedManHours(): number {
    return this._plannedManHours;
  }

  get actualManHours(): number {
    return this._actualManHours;
  }

  get varianceManHours(): number {
    return this._varianceManHours;
  }

  get metadata(): Record<string, unknown> | undefined {
    return this._metadata;
  }

  get taskHistories(): TaskProgressHistory[] | undefined {
    return this._taskHistories;
  }

  get createdAt(): Date | undefined {
    return this._createdAt;
  }

  get updatedAt(): Date | undefined {
    return this._updatedAt;
  }

  // ビジネスロジック
  isManualSnapshot(): boolean {
    return this._recordType === RecordType.MANUAL_SNAPSHOT;
  }

  isAutoRecord(): boolean {
    return this._recordType === RecordType.AUTO;
  }

  getVariancePercentage(): number {
    if (this._plannedManHours === 0) {
      return 0;
    }
    return (this._varianceManHours / this._plannedManHours) * 100;
  }

  isDelayed(): boolean {
    return this._varianceManHours > 0;
  }

  isAheadOfSchedule(): boolean {
    return this._varianceManHours < 0;
  }

  // 静的ファクトリーメソッド
  static createAutoRecord(
    wbsId: number,
    totalTaskCount: number,
    completedCount: number,
    inProgressCount: number,
    notStartedCount: number,
    completionRate: number,
    plannedManHours: number,
    actualManHours: number,
    varianceManHours: number,
    metadata?: Record<string, unknown>
  ): WbsProgressHistory {
    return new WbsProgressHistory({
      wbsId,
      recordedAt: new Date(),
      recordType: RecordType.AUTO,
      totalTaskCount,
      completedCount,
      inProgressCount,
      notStartedCount,
      completionRate,
      plannedManHours,
      actualManHours,
      varianceManHours,
      metadata,
    });
  }

  static createManualSnapshot(
    wbsId: number,
    snapshotName: string,
    totalTaskCount: number,
    completedCount: number,
    inProgressCount: number,
    notStartedCount: number,
    completionRate: number,
    plannedManHours: number,
    actualManHours: number,
    varianceManHours: number,
    metadata?: Record<string, unknown>
  ): WbsProgressHistory {
    return new WbsProgressHistory({
      wbsId,
      recordedAt: new Date(),
      recordType: RecordType.MANUAL_SNAPSHOT,
      snapshotName,
      totalTaskCount,
      completedCount,
      inProgressCount,
      notStartedCount,
      completionRate,
      plannedManHours,
      actualManHours,
      varianceManHours,
      metadata,
    });
  }
}