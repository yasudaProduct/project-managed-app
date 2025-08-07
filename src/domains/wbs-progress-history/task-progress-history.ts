/**
 * タスク進捗履歴ドメインモデル
 */

export interface TaskProgressHistoryProps {
  id?: number;
  wbsProgressHistoryId?: number;
  taskId: number;
  taskNo: string;
  taskName: string;
  status: string;
  assigneeId?: number;
  assigneeName?: string;
  phaseId?: number;
  phaseName?: string;
  plannedStartDate?: Date;
  plannedEndDate?: Date;
  actualStartDate?: Date;
  actualEndDate?: Date;
  plannedManHours: number;
  actualManHours: number;
  progressRate: number;
  createdAt?: Date;
}

export class TaskProgressHistory {
  private readonly _id?: number;
  private readonly _wbsProgressHistoryId?: number;
  private readonly _taskId: number;
  private readonly _taskNo: string;
  private readonly _taskName: string;
  private readonly _status: string;
  private readonly _assigneeId?: number;
  private readonly _assigneeName?: string;
  private readonly _phaseId?: number;
  private readonly _phaseName?: string;
  private readonly _plannedStartDate?: Date;
  private readonly _plannedEndDate?: Date;
  private readonly _actualStartDate?: Date;
  private readonly _actualEndDate?: Date;
  private readonly _plannedManHours: number;
  private readonly _actualManHours: number;
  private readonly _progressRate: number;
  private readonly _createdAt?: Date;

  constructor(props: TaskProgressHistoryProps) {
    this.validateProps(props);

    this._id = props.id;
    this._wbsProgressHistoryId = props.wbsProgressHistoryId;
    this._taskId = props.taskId;
    this._taskNo = props.taskNo;
    this._taskName = props.taskName;
    this._status = props.status;
    this._assigneeId = props.assigneeId;
    this._assigneeName = props.assigneeName;
    this._phaseId = props.phaseId;
    this._phaseName = props.phaseName;
    this._plannedStartDate = props.plannedStartDate;
    this._plannedEndDate = props.plannedEndDate;
    this._actualStartDate = props.actualStartDate;
    this._actualEndDate = props.actualEndDate;
    this._plannedManHours = props.plannedManHours;
    this._actualManHours = props.actualManHours;
    this._progressRate = props.progressRate;
    this._createdAt = props.createdAt;
  }

  private validateProps(props: TaskProgressHistoryProps): void {
    if (props.taskId <= 0) {
      throw new Error('タスクIDは正の数である必要があります');
    }

    if (!props.taskNo || props.taskNo.trim() === '') {
      throw new Error('タスク番号は必須です');
    }

    if (!props.taskName || props.taskName.trim() === '') {
      throw new Error('タスク名は必須です');
    }

    if (!props.status || props.status.trim() === '') {
      throw new Error('ステータスは必須です');
    }

    if (props.plannedManHours < 0) {
      throw new Error('予定工数は0以上である必要があります');
    }

    if (props.actualManHours < 0) {
      throw new Error('実績工数は0以上である必要があります');
    }

    if (props.progressRate < 0 || props.progressRate > 100) {
      throw new Error('進捗率は0から100の範囲である必要があります');
    }

    // 日付の整合性チェック
    if (props.plannedStartDate && props.plannedEndDate && 
        props.plannedStartDate > props.plannedEndDate) {
      throw new Error('予定開始日は予定終了日以前である必要があります');
    }

    if (props.actualStartDate && props.actualEndDate && 
        props.actualStartDate > props.actualEndDate) {
      throw new Error('実績開始日は実績終了日以前である必要があります');
    }
  }

  // Getters
  get id(): number | undefined {
    return this._id;
  }

  get wbsProgressHistoryId(): number | undefined {
    return this._wbsProgressHistoryId;
  }

  get taskId(): number {
    return this._taskId;
  }

  get taskNo(): string {
    return this._taskNo;
  }

  get taskName(): string {
    return this._taskName;
  }

  get status(): string {
    return this._status;
  }

  get assigneeId(): number | undefined {
    return this._assigneeId;
  }

  get assigneeName(): string | undefined {
    return this._assigneeName;
  }

  get phaseId(): number | undefined {
    return this._phaseId;
  }

  get phaseName(): string | undefined {
    return this._phaseName;
  }

  get plannedStartDate(): Date | undefined {
    return this._plannedStartDate;
  }

  get plannedEndDate(): Date | undefined {
    return this._plannedEndDate;
  }

  get actualStartDate(): Date | undefined {
    return this._actualStartDate;
  }

  get actualEndDate(): Date | undefined {
    return this._actualEndDate;
  }

  get plannedManHours(): number {
    return this._plannedManHours;
  }

  get actualManHours(): number {
    return this._actualManHours;
  }

  get progressRate(): number {
    return this._progressRate;
  }

  get createdAt(): Date | undefined {
    return this._createdAt;
  }

  // ビジネスロジック
  isCompleted(): boolean {
    return this._status === 'COMPLETED';
  }

  isInProgress(): boolean {
    return this._status === 'IN_PROGRESS';
  }

  isNotStarted(): boolean {
    return this._status === 'NOT_STARTED';
  }

  getManHourVariance(): number {
    return this._actualManHours - this._plannedManHours;
  }

  getManHourVariancePercentage(): number {
    if (this._plannedManHours === 0) {
      return 0;
    }
    return (this.getManHourVariance() / this._plannedManHours) * 100;
  }

  isOverBudget(): boolean {
    return this.getManHourVariance() > 0;
  }

  isUnderBudget(): boolean {
    return this.getManHourVariance() < 0;
  }

  hasAssignee(): boolean {
    return this._assigneeId !== undefined && this._assigneeId > 0;
  }

  hasPhase(): boolean {
    return this._phaseId !== undefined && this._phaseId > 0;
  }

  getPlannedDuration(): number | undefined {
    if (!this._plannedStartDate || !this._plannedEndDate) {
      return undefined;
    }
    const diffTime = this._plannedEndDate.getTime() - this._plannedStartDate.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)); // 日数で返す
  }

  getActualDuration(): number | undefined {
    if (!this._actualStartDate || !this._actualEndDate) {
      return undefined;
    }
    const diffTime = this._actualEndDate.getTime() - this._actualStartDate.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)); // 日数で返す
  }

  isDelayed(): boolean {
    const plannedDuration = this.getPlannedDuration();
    const actualDuration = this.getActualDuration();
    
    if (plannedDuration === undefined || actualDuration === undefined) {
      return false;
    }
    
    return actualDuration > plannedDuration;
  }
}