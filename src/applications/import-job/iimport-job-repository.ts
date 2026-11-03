import { ImportJob, ImportJobProgress } from '@/domains/import-job/import-job'
import { ImportJobType, ImportJobStatus } from '@/domains/import-job/import-job-enums'
import type { ImportJobStartResult } from '@/types/import-job'

export interface IImportJobRepository {
  create(job: ImportJob): Promise<ImportJob>
  update(job: ImportJob): Promise<ImportJob>
  /** 保存済みのステータスが expectedStatus の場合のみ更新する。更新できた場合 true */
  updateIfStatus(job: ImportJob, expectedStatus: ImportJobStatus): Promise<boolean>
  /**
   * 開始したジョブ（RUNNING）を、保存済みが PENDING かつ他に RUNNING のジョブがない場合のみ保存する。
   * 判定と更新は排他して行うため、同時に呼ばれても RUNNING になるジョブは常に1件以下
   */
  updateIfStartable(job: ImportJob): Promise<ImportJobStartResult>
  findById(id: string): Promise<ImportJob | null>
  findAll(limit?: number): Promise<ImportJob[]>
  findByUser(userId: string, limit?: number): Promise<ImportJob[]>
  /** 作成順（古い順）に返す */
  findByStatus(status: ImportJobStatus): Promise<ImportJob[]>
  findByTypeAndStatus(type: ImportJobType, status: ImportJobStatus): Promise<ImportJob[]>
  addProgress(jobId: string, progress: ImportJobProgress): Promise<void>
  getProgress(jobId: string, limit?: number): Promise<ImportJobProgress[]>
}