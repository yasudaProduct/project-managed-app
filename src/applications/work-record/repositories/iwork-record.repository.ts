import { WorkRecord } from '@/domains/work-records/work-recoed'

export interface IWorkRecordRepository {
  findByDateRange(userId: string, startDate: Date, endDate: Date): Promise<WorkRecord[]>
  bulkCreate(workRecords: WorkRecord[]): Promise<void>
  bulkUpsert(workRecords: WorkRecord[]): Promise<{ created: number; updated: number }>
  deleteByDateRange(userId: string, startDate: Date, endDate: Date): Promise<number>
  deleteByUserAndDateRange(userIds: string[], startDate: Date, endDate: Date): Promise<number>
}