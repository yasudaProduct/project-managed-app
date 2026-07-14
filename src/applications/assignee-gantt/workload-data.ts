/**
 * 担当者別作業負荷のプレーンな転送オブジェクト（Server Action / アプリサービス共通）。
 * ドメインの AssigneeWorkload を ISO 文字列等にプレーン化したもの。
 */
export interface WorkloadData {
  assigneeId: string;
  assigneeName: string;
  assigneeRate: number;
  dailyAllocations: {
    date: string;
    availableHours: number;
    allocatedHours: number;
    isOverloaded: boolean;
    utilizationRate: number;
    overloadedHours: number;
    isOverloadedByStandard: boolean;
    overloadedByStandardHours: number;
    rateAllowedHours: number;
    isOverRateCapacity: boolean;
    overRateHours: number;
    isWeekend?: boolean;
    isCompanyHoliday?: boolean;
    userSchedules?: {
      title: string;
      startTime: string;
      endTime: string;
      durationHours: number;
    }[];
    taskAllocations: {
      taskId: string;
      taskName: string;
      allocatedHours: number;
      totalHours: number;
      periodStart?: string;
      periodEnd?: string;
      /** 他WBS合算時の所属プロジェクト表示用ラベル */
      projectName?: string;
    }[];
  }[];
}

/** 実現不可能タスク警告のプレーンな転送オブジェクト */
export interface AssigneeWarningData {
  taskId: number;
  taskNo: string;
  taskName: string;
  assigneeId?: string;
  assigneeName?: string;
  periodStart?: string;
  periodEnd?: string;
  reason: 'NO_WORKING_DAYS';
}

/** 担当者ガント系 Server Action の共通レスポンス */
export interface AssigneeGanttResponse {
  success: boolean;
  data?: WorkloadData[];
  warnings?: AssigneeWarningData[];
  error?: string;
}
