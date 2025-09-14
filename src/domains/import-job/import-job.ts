import { ImportJobType, ImportJobStatus } from '@prisma/client'

export interface ImportJobOptions {
  type: ImportJobType
  targetMonth?: string
  targetProjectIds?: string[]
  wbsId?: number
  options: Record<string, unknown>
}

export interface ImportJobProgress {
  message: string
  detail?: Record<string, unknown>
  level: 'info' | 'warning' | 'error'
  recordedAt: Date
}

export class ImportJob {
  constructor(
    public readonly id: string,
    public readonly type: ImportJobType,
    public status: ImportJobStatus,
    public readonly createdBy: string | null,
    public readonly createdAt: Date,
    public updatedAt: Date,
    public targetMonth?: string,
    public targetProjectIds: string[] = [],
    public wbsId?: number,
    public options: Record<string, unknown> = {},
    public totalRecords: number = 0,
    public processedRecords: number = 0,
    public successCount: number = 0,
    public errorCount: number = 0,
    public startedAt?: Date,
    public completedAt?: Date,
    public errorDetails?: Record<string, unknown>,
    public result?: Record<string, unknown>
  ) { }

  static create(options: ImportJobOptions & { createdBy?: string | null }): ImportJob {
    const now = new Date()
    return new ImportJob(
      '', // IDは永続化時に生成
      options.type,
      ImportJobStatus.PENDING,
      options.createdBy ?? null,
      now,
      now,
      options.targetMonth,
      options.targetProjectIds || [],
      options.wbsId,
      options.options
    )
  }

  start(): void {
    if (this.status !== ImportJobStatus.PENDING) {
      throw new Error('ジョブは開始可能な状態ではありません')
    }
    this.status = ImportJobStatus.RUNNING
    this.startedAt = new Date()
    this.updatedAt = new Date()
  }

  updateProgress(processed: number, success: number, error: number): void {
    if (this.status !== ImportJobStatus.RUNNING) {
      throw new Error('実行中のジョブのみ進捗を更新できます')
    }
    this.processedRecords = processed
    this.successCount = success
    this.errorCount = error
    this.updatedAt = new Date()
  }

  complete(result: Record<string, unknown>): void {
    if (this.status !== ImportJobStatus.RUNNING) {
      throw new Error('実行中のジョブのみ完了できます')
    }
    this.status = ImportJobStatus.COMPLETED
    this.completedAt = new Date()
    this.result = result
    this.updatedAt = new Date()
  }

  fail(errorDetails: Record<string, unknown>): void {
    if (this.status !== ImportJobStatus.RUNNING && this.status !== ImportJobStatus.PENDING) {
      throw new Error('実行中または待機中のジョブのみ失敗にできます')
    }
    this.status = ImportJobStatus.FAILED
    this.completedAt = new Date()
    this.errorDetails = errorDetails
    this.updatedAt = new Date()
  }

  cancel(): void {
    if (this.status === ImportJobStatus.COMPLETED || this.status === ImportJobStatus.FAILED) {
      throw new Error('完了または失敗したジョブはキャンセルできません')
    }
    this.status = ImportJobStatus.CANCELLED
    this.completedAt = new Date()
    this.updatedAt = new Date()
  }

  get progress(): number {
    if (this.totalRecords === 0) return 0
    return Math.round((this.processedRecords / this.totalRecords) * 100)
  }

  get isRunning(): boolean {
    return this.status === ImportJobStatus.RUNNING
  }

  get isCompleted(): boolean {
    return this.status === ImportJobStatus.COMPLETED
  }

  get isFailed(): boolean {
    return this.status === ImportJobStatus.FAILED
  }

  get isCancelled(): boolean {
    return this.status === ImportJobStatus.CANCELLED
  }

  get isFinished(): boolean {
    return this.isCompleted || this.isFailed || this.isCancelled
  }
}