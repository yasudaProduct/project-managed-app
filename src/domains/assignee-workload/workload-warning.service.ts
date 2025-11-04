import { Task } from '@/domains/task/task';
import { WbsAssignee } from '@/domains/wbs/wbs-assignee';
import { CompanyCalendar } from '@/domains/calendar/company-calendar';
import { AssigneeWorkingCalendar } from '@/domains/calendar/assignee-working-calendar';
import { UserSchedule } from '@/domains/calendar/assignee-working-calendar';
import { AssigneeGanttCalculationOptions } from '@/types/project-settings';

/**
 * 作業負荷警告を表すインターフェース
 */
export interface WorkloadWarning {
  taskId: number;
  taskNo: string;
  taskName: string;
  assigneeId?: string;
  assigneeName?: string;
  periodStart?: Date;
  periodEnd?: Date;
  reason: 'NO_WORKING_DAYS';
}

/**
 * 作業負荷警告ドメインサービス
 * 担当者の作業負荷に関する警告検出ロジックを提供
 */
export class WorkloadWarningService {
  /**
   * タスクが実現不可能（全日非稼働）かを検証
   * @param task タスク
   * @param assignee 担当者（未割当の場合はundefined）
   * @param companyCalendar 会社カレンダー
   * @param userSchedules 個人予定（担当者が指定されている場合のみ）
   * @param calculationOptions 計算オプション
   * @returns 警告情報（問題がない場合はnull）
   */
  validateTaskFeasibility(
    task: Task,
    assignee: WbsAssignee | undefined,
    companyCalendar: CompanyCalendar,
    userSchedules: UserSchedule[] = [],
    calculationOptions: AssigneeGanttCalculationOptions
  ): WorkloadWarning | null {
    const yoteiStart = task.getYoteiStart();
    const yoteiEnd = task.getYoteiEnd();

    if (!yoteiStart || !yoteiEnd) {
      return null;
    }

    let hasWorkingDays = false;

    if (assignee) {
      // 担当者が割り当てられている場合：個人予定も含めた稼働可能時間で判定
      const workingCalendar = new AssigneeWorkingCalendar(assignee, companyCalendar, userSchedules, calculationOptions);
      let totalAvailable = 0;

      for (let d = new Date(yoteiStart); d <= yoteiEnd; d.setDate(d.getDate() + 1)) {
        const day = new Date(d);
        totalAvailable += workingCalendar.getAvailableHours(day);
      }

      hasWorkingDays = totalAvailable > 0;
    } else {
      // 担当者が未割当の場合：会社休日のみで判定
      for (let d = new Date(yoteiStart); d <= yoteiEnd; d.setDate(d.getDate() + 1)) {
        const day = new Date(d);
        if (!companyCalendar.isCompanyHoliday(day)) {
          hasWorkingDays = true;
          break;
        }
      }
    }

    if (!hasWorkingDays) {
      return {
        taskId: task.id!,
        taskNo: task.taskNo.getValue(),
        taskName: task.name,
        assigneeId: assignee?.userId,
        assigneeName: assignee?.userName || assignee?.userId,
        periodStart: yoteiStart,
        periodEnd: yoteiEnd,
        reason: 'NO_WORKING_DAYS'
      };
    }

    return null;
  }

  /**
   * 複数タスクの実現可能性を一括検証
   * @param tasks タスク一覧
   * @param assigneeMap 担当者マップ（assigneeId -> WbsAssignee）
   * @param companyCalendar 会社カレンダー
   * @param userSchedulesMap 個人予定マップ（userId -> UserSchedule[]）
   * @param calculationOptions 計算オプション
   * @returns 警告一覧
   */
  validateTasksFeasibility(
    tasks: Task[],
    assigneeMap: Map<number, WbsAssignee>,
    companyCalendar: CompanyCalendar,
    userSchedulesMap: Map<string, UserSchedule[]>,
    calculationOptions: AssigneeGanttCalculationOptions
  ): WorkloadWarning[] {
    const warnings: WorkloadWarning[] = [];

    for (const task of tasks) {
      const assignee = task.assigneeId != null ? assigneeMap.get(task.assigneeId) : undefined;
      const userSchedules = assignee ? (userSchedulesMap.get(assignee.userId) || []) : [];

      const warning = this.validateTaskFeasibility(task, assignee, companyCalendar, userSchedules, calculationOptions);
      if (warning) {
        warnings.push(warning);
      }
    }

    return warnings;
  }
}