import { WorkRecord } from '@/domains/work-record/work-record'
import type { WorkRecordDetail } from '@/types/work-record'

/** ユーザー・日付ごとの実績時間の合計（全WBS横断） */
export type DailyWorkHours = {
  userId: string
  date: Date
  hours: number
}

export interface IWorkRecordRepository {
  findAll(): Promise<WorkRecordDetail[]>
  bulkCreate(workRecords: WorkRecord[]): Promise<void>
  bulkUpsert(workRecords: WorkRecord[]): Promise<{ created: number; updated: number }>
  /** 期間内（両端含む）のユーザー・日付ごとの実績時間の合計（全WBS横断） */
  findDailyHoursByUsers(userIds: string[], startDate: Date, endDate: Date): Promise<DailyWorkHours[]>
  /** 指定日以前で実績時間が0より大きい最終日（ユーザーごと。実績がなければ含まない） */
  findLastRecordDateByUsers(userIds: string[], onOrBefore: Date): Promise<Map<string, Date>>
  deleteByUserAndDateRange(
    userIds: string[],
    startDate: Date,
    endDate: Date,
    wbsIds: number[]
  ): Promise<number>
}