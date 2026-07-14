import { AssigneeWorkload } from '@/domains/assignee-workload/assignee-workload';
import { WorkloadData } from './workload-data';

/** 標準勤務時間の表示基準(既存UI・派生フラグと同一の固定値) */
const STANDARD_HOURS_THRESHOLD = 7.5;

/**
 * ドメインの AssigneeWorkload をプレーンな WorkloadData へ変換する。
 * 過負荷・稼働率・標準超過・レート超過などの派生フィールドはここで一元的に計算する。
 */
export function toWorkloadData(workload: AssigneeWorkload): WorkloadData {
  const rate = workload.assigneeRate;
  return {
    assigneeId: workload.assigneeId,
    assigneeName: workload.assigneeName,
    assigneeRate: rate,
    dailyAllocations: workload.dailyAllocations.map(daily => ({
      date: daily.date.toISOString(),
      availableHours: daily.availableHours,
      allocatedHours: daily.allocatedHours,
      isOverloaded: daily.allocatedHours > daily.availableHours,
      utilizationRate: daily.availableHours > 0 ? daily.allocatedHours / daily.availableHours : 0,
      overloadedHours: Math.max(0, daily.allocatedHours - daily.availableHours),
      isOverloadedByStandard: daily.allocatedHours > STANDARD_HOURS_THRESHOLD,
      overloadedByStandardHours: Math.max(0, daily.allocatedHours - STANDARD_HOURS_THRESHOLD),
      rateAllowedHours: daily.availableHours * rate,
      isOverRateCapacity: daily.allocatedHours > daily.availableHours * rate,
      overRateHours: Math.max(0, daily.allocatedHours - daily.availableHours * rate),
      isWeekend: daily.isWeekend,
      isCompanyHoliday: daily.isCompanyHoliday,
      userSchedules: daily.userSchedules,
      taskAllocations: daily.taskAllocations.map(task => ({
        taskId: task.taskId,
        taskName: task.taskName,
        allocatedHours: task.allocatedHours,
        totalHours: task.totalHours,
        periodStart: task.periodStart?.toISOString(),
        periodEnd: task.periodEnd?.toISOString(),
        projectName: task.projectName,
      })),
    })),
  };
}
