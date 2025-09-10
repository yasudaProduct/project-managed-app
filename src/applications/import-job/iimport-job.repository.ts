import { ImportJob, ImportJobProgress } from '@/domains/import-job/import-job'
import { ImportJobType, ImportJobStatus } from '@prisma/client'

export interface IImportJobRepository {
  create(job: ImportJob): Promise<ImportJob>
  update(job: ImportJob): Promise<ImportJob>
  findById(id: string): Promise<ImportJob | null>
  findByUser(userId: string, limit?: number): Promise<ImportJob[]>
  findByStatus(status: ImportJobStatus): Promise<ImportJob[]>
  findByTypeAndStatus(type: ImportJobType, status: ImportJobStatus): Promise<ImportJob[]>
  addProgress(jobId: string, progress: ImportJobProgress): Promise<void>
  getProgress(jobId: string, limit?: number): Promise<ImportJobProgress[]>
}