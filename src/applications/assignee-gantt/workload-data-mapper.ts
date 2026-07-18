import { AssigneeWorkload } from '@/domains/assignee-workload/assignee-workload';
import { WorkloadData, RateBasis } from './workload-data';

/** 標準勤務時間の表示基準(既存UI・派生フラグと同一の固定値) */
const STANDARD_HOURS_THRESHOLD = 7.5;

/**
 * ドメインの AssigneeWorkload をプレーンな WorkloadData へ変換する。
 * 過負荷・稼働率・標準超過・レート超過などの派生フィールドはここで一元的に計算する。
 *
 * レート超過(Rバッジ)の判定:
 * - 既定: 従来仕様。合計配分 > availableHours × assigneeRate
 * - rateBasis指定(他WBS合算行): 現WBS分の配分 > 標準勤務時間 × 現WBS参画率(取り分)。
 *   合算行の配分は「ラベル(projectName)なし = 現WBS分」という本機能の規約に依存する
 *   (外部WBS由来の配分には必ずプロジェクト名ラベルが付く)。
 *   過負荷・稼働率は合算値のまま判定する(ハイブリッド方式)。
 */
export function toWorkloadData(
  workload: AssigneeWorkload,
  options?: { rateBasis?: RateBasis }
): WorkloadData {
  const rate = workload.assigneeRate;
  const rateBasis = options?.rateBasis;
  return {
    assigneeId: workload.assigneeId,
    assigneeName: workload.assigneeName,
    assigneeRate: rate,
    dailyAllocations: workload.dailyAllocations.map(daily => {
      const rateAllowedHours = rateBasis
        ? rateBasis.standardWorkingHours * rateBasis.rate
        : daily.availableHours * rate;
      const rateJudgedHours = rateBasis
        ? daily.taskAllocations
          .filter(task => task.projectName == null)
          .reduce((total, task) => total + task.allocatedHours, 0)
        : daily.allocatedHours;
      return {
        date: daily.date.toISOString(),
        availableHours: daily.availableHours,
        allocatedHours: daily.allocatedHours,
        isOverloaded: daily.allocatedHours > daily.availableHours,
        utilizationRate: daily.availableHours > 0 ? daily.allocatedHours / daily.availableHours : 0,
        overloadedHours: Math.max(0, daily.allocatedHours - daily.availableHours),
        isOverloadedByStandard: daily.allocatedHours > STANDARD_HOURS_THRESHOLD,
        overloadedByStandardHours: Math.max(0, daily.allocatedHours - STANDARD_HOURS_THRESHOLD),
        rateAllowedHours,
        isOverRateCapacity: rateJudgedHours > rateAllowedHours,
        overRateHours: Math.max(0, rateJudgedHours - rateAllowedHours),
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
      };
    }),
  };
}
