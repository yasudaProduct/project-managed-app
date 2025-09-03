import { AssigneeWorkload } from '@/domains/assignee-workload/assignee-workload';

export interface IAssigneeGanttService {
  /**
   * 指定されたWBSと期間に対する担当者別の作業負荷を取得する
   * @param wbsId WBS ID
   * @param startDate 開始日
   * @param endDate 終了日
   * @returns 担当者別作業負荷の配列
   */
  getAssigneeWorkloads(
    wbsId: number,
    startDate: Date,
    endDate: Date
  ): Promise<AssigneeWorkload[]>;

  /**
   * 指定された担当者の作業負荷を取得する
   * @param wbsId WBS ID  
   * @param assigneeId 担当者ID
   * @param startDate 開始日
   * @param endDate 終了日
   * @returns 担当者の作業負荷
   */
  getAssigneeWorkload(
    wbsId: number,
    assigneeId: string,
    startDate: Date,
    endDate: Date
  ): Promise<AssigneeWorkload>;

  /**
   * 表示期間において、実現不可能（すべて非稼働日）のタスク警告を取得する
   */
  getAssigneeWarnings(
    wbsId: number,
    startDate: Date,
    endDate: Date
  ): Promise<{
    taskId: string;
    taskName: string;
    assigneeId?: string;
    assigneeName?: string;
    periodStart?: Date;
    periodEnd?: Date;
    reason: 'NO_WORKING_DAYS';
  }[]>;
}