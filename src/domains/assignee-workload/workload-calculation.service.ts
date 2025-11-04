import { Task } from '@/domains/task/task';
import { WbsAssignee } from '@/domains/wbs/wbs-assignee';
import { UserSchedule, AssigneeWorkingCalendar } from '@/domains/calendar/assignee-working-calendar';
import { CompanyCalendar } from '@/domains/calendar/company-calendar';
import { DailyWorkAllocation } from './daily-work-allocation';
import { TaskAllocation } from './task-allocation';
import { AssigneeGanttCalculationOptions } from '@/types/project-settings';

/**
 * 作業負荷計算ドメインサービス
 * 担当者の作業負荷計算に関するビジネスロジックを集約
 */
export class WorkloadCalculationService {
  /**
   * 担当者の日別作業配分を計算
   * @param tasks 担当者のタスク一覧
   * @param assignee 担当者
   * @param userSchedules 個人予定
   * @param companyCalendar 会社カレンダー
   * @param startDate 開始日
   * @param endDate 終了日
   * @param calculationOptions 計算オプション
   * @returns 日別作業配分の配列
   */
  calculateDailyAllocations(
    tasks: Task[],
    assignee: WbsAssignee,
    userSchedules: UserSchedule[],
    companyCalendar: CompanyCalendar,
    startDate: Date,
    endDate: Date,
    calculationOptions: AssigneeGanttCalculationOptions
  ): DailyWorkAllocation[] {
    const dailyAllocations: DailyWorkAllocation[] = [];
    const workingCalendar = new AssigneeWorkingCalendar(assignee, companyCalendar, userSchedules, calculationOptions);

    // 指定期間内の日別にループ
    for (let currentDate = new Date(startDate); currentDate <= endDate; currentDate.setDate(currentDate.getDate() + 1)) {
      // その日の稼働可能時間を計算
      const availableHours = workingCalendar.getAvailableHours(currentDate);

      const isCompanyHoliday = companyCalendar.isCompanyHoliday(currentDate); // 会社休日の場合はtrue
      const dayOfWeek = currentDate.getDay(); // 曜日を取得（0:日曜日、6:土曜日）
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6; // 土日の場合はtrue

      // 当日のユーザースケジュール（ツールチップ表示用）
      const schedulesForDay = userSchedules
        .filter(schedule => schedule.date.toDateString() === currentDate.toDateString()) // その日の個人予定を取得
        .map(schedule => ({
          title: schedule.title,
          startTime: schedule.startTime,
          endTime: schedule.endTime,
          durationHours: this.calculateScheduleDuration(schedule.startTime, schedule.endTime) // 個人予定の期間を計算
        }));

      // その日にアサインされたタスクの配分を計算（稼働可能時間に比例して配分）
      const taskAllocations = this.calculateTaskAllocationsForDate(
        tasks,
        new Date(currentDate),
        availableHours,
        workingCalendar
      );

      // 日別作業配分を作成
      const dailyAllocation = DailyWorkAllocation.create({
        date: new Date(currentDate),
        availableHours,
        taskAllocations,
        isWeekend,
        isCompanyHoliday,
        userSchedules: schedulesForDay
      });

      dailyAllocations.push(dailyAllocation);
    }

    return dailyAllocations;
  }

  /**
   * 特定日のタスク配分を計算
   * @param tasks タスク一覧
   * @param date 対象日
   * @param availableHours 稼働可能時間
   * @param workingCalendar 稼働カレンダー
   * @returns タスク配分の配列
   */
  calculateTaskAllocationsForDate(
    tasks: Task[],
    date: Date,
    availableHours: number,
    workingCalendar: AssigneeWorkingCalendar
  ): TaskAllocation[] {
    const taskAllocations: TaskAllocation[] = [];

    // その日に実行されるタスクを抽出
    const activeTasks = tasks.filter(task => this.isTaskActiveOnDate(task, date)); // その日に実行されるタスクを抽出

    if (activeTasks.length === 0 || availableHours === 0) {
      return taskAllocations; // 実行されるタスクがない場合は空配列を返す
    }

    // 各タスクの工数を日別に按分（期間内availableHours比率に基づく配分）
    for (const task of activeTasks) {
      const yoteiStart = task.getYoteiStart();
      const yoteiEnd = task.getYoteiEnd();
      const totalHours = task.getYoteiKosus();

      if (!yoteiStart || !yoteiEnd || !totalHours) {
        continue;
      }

      // 期間全体の稼働可能時間を集計（個人予定・会社休日・稼働率=0を考慮）
      let totalAvailableInPeriod = 0;
      for (let d = new Date(yoteiStart); d <= yoteiEnd; d.setDate(d.getDate() + 1)) {
        const day = new Date(d);
        totalAvailableInPeriod += workingCalendar.getAvailableHours(day);
      }

      if (totalAvailableInPeriod <= 0) {
        continue;
      }

      // 当日の稼働可能時間に比例して配分
      const availableToday = workingCalendar.getAvailableHours(date);
      const ratio = availableToday / totalAvailableInPeriod;
      const allocatedHours = totalHours * ratio;

      if (allocatedHours > 0) {
        const taskAllocation = TaskAllocation.create({
          taskId: task.id?.toString() || '0',
          taskName: task.name,
          allocatedHours,
          totalHours: task.getYoteiKosus() || 0,
          periodStart: task.getYoteiStart() || undefined,
          periodEnd: task.getYoteiEnd() || undefined
        });
        taskAllocations.push(taskAllocation);
      }
    }

    return taskAllocations;
  }

  /**
   * タスクが特定日にアクティブかを判定
   * @param task タスク
   * @param date 対象日
   * @returns アクティブかどうか
   */
  isTaskActiveOnDate(task: Task, date: Date): boolean {
    const yoteiStart = task.getYoteiStart();
    const yoteiEnd = task.getYoteiEnd();
    if (!yoteiStart || !yoteiEnd) {
      return false;
    }
    // タイムゾーン起因のずれを避けるため、ローカル日付(YYYY-MM-DD)で比較する
    const target = this.toYmd(date);
    const start = this.toYmd(yoteiStart);
    const end = this.toYmd(yoteiEnd);
    return target >= start && target <= end;
  }

  /**
   * スケジュールの期間を計算（時間単位）
   * @param startTime 開始時刻（HH:mm形式）
   * @param endTime 終了時刻（HH:mm形式）
   * @returns 期間（時間）
   */
  calculateScheduleDuration(startTime: string, endTime: string): number {
    const [startHour, startMin] = startTime.split(':').map(Number);
    const [endHour, endMin] = endTime.split(':').map(Number);
    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;
    return (endMinutes - startMinutes) / 60; // 時間単位で返す
  }

  /**
   * 日付をYYYY-MM-DD形式に変換
   * @param date 日付
   * @returns YYYY-MM-DD形式の文字列
   */
  private toYmd(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }
}