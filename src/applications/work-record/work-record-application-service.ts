import { injectable, inject } from 'inversify'
import { WorkRecord } from '@/domains/work-records/work-recoed'
import type { IWorkRecordRepository } from './repositories/iwork-record.repository'
import { SYMBOL } from '@/types/symbol'

export interface IWorkRecordApplicationService {
  findByDateRange(userId: string, startDate: Date, endDate: Date): Promise<WorkRecord[]>
  bulkCreate(workRecords: WorkRecord[]): Promise<void>
  bulkUpsert(workRecords: WorkRecord[]): Promise<{ created: number; updated: number }>
  deleteByDateRange(userId: string, startDate: Date, endDate: Date): Promise<number>
  deleteByUserAndDateRange(userIds: string[], startDate: Date, endDate: Date): Promise<number>
}

@injectable()
export class WorkRecordApplicationService implements IWorkRecordApplicationService {
  constructor(
    @inject(SYMBOL.IWorkRecordRepository) private workRecordRepository: IWorkRecordRepository
  ) { }

  async findByDateRange(userId: string, startDate: Date, endDate: Date): Promise<WorkRecord[]> {
    return await this.workRecordRepository.findByDateRange(userId, startDate, endDate)
  }

  async bulkCreate(workRecords: WorkRecord[]): Promise<void> {
    if (workRecords.length === 0) return
    await this.workRecordRepository.bulkCreate(workRecords)
  }

  async bulkUpsert(workRecords: WorkRecord[]): Promise<{ created: number; updated: number }> {
    if (workRecords.length === 0) return { created: 0, updated: 0 }
    return await this.workRecordRepository.bulkUpsert(workRecords)
  }

  async deleteByDateRange(userId: string, startDate: Date, endDate: Date): Promise<number> {
    return await this.workRecordRepository.deleteByDateRange(userId, startDate, endDate)
  }

  async deleteByUserAndDateRange(userIds: string[], startDate: Date, endDate: Date): Promise<number> {
    if (userIds.length === 0) return 0
    return await this.workRecordRepository.deleteByUserAndDateRange(userIds, startDate, endDate)
  }
}