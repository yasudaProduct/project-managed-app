import { AssigneeWorkingCalendar } from './assignee-working-calendar';
import { CompanyCalendar } from './company-calendar';
import { WbsAssignee } from '../wbs/wbs-assignee';
import { UserSchedule } from './assignee-working-calendar';

export class BusinessDayPeriod {
  private workingCalendar: AssigneeWorkingCalendar;

  constructor(
    private readonly startDate: Date,
    private readonly endDate: Date,
    private readonly assignee: WbsAssignee,
    companyCalendar: CompanyCalendar,
    userSchedules: UserSchedule[]
  ) {
    this.workingCalendar = new AssigneeWorkingCalendar(assignee, companyCalendar, userSchedules);
  }

  /**
   * 期間の営業日数を担当者固有の条件で計算
   * @returns 営業日数
   */
  getBusinessDaysCount(): number {
    let count = 0;
    const current = new Date(this.startDate);

    while (current <= this.endDate) {
      if (this.workingCalendar.isWorkingDay(current)) {
        count++;
      }
      current.setDate(current.getDate() + 1);
    }

    return count;
  }

  /**
   * 月ごとの営業日数を取得
   * @returns 月ごとの営業日数
   */
  getBusinessDaysByMonth(): Map<string, number> {
    const monthlyBusinessDays = new Map<string, number>();
    const current = new Date(this.startDate);

    while (current <= this.endDate) {
      if (this.workingCalendar.isWorkingDay(current)) {
        const yearMonth = this.formatYearMonth(current);
        const currentCount = monthlyBusinessDays.get(yearMonth) || 0;
        monthlyBusinessDays.set(yearMonth, currentCount + 1);
      }
      current.setDate(current.getDate() + 1);
    }

    return monthlyBusinessDays;
  }

  /**
   * 月ごとの稼働可能時間を取得
   * @returns 月ごとの稼働可能時間
   */
  getAvailableHoursByMonth(): Map<string, number> {
    const monthlyHours = new Map<string, number>();
    const current = new Date(this.startDate);

    while (current <= this.endDate) {
      const availableHours = this.workingCalendar.getAvailableHours(current);
      if (availableHours > 0) {
        const yearMonth = this.formatYearMonth(current);
        const currentHours = monthlyHours.get(yearMonth) || 0;
        monthlyHours.set(yearMonth, currentHours + availableHours);
      }
      current.setDate(current.getDate() + 1);
    }

    return monthlyHours;
  }

  /**
   * 月ごとの工数を営業日数で案分する
   * @param totalHours 総工数
   * @returns 月ごとの工数
   */
  distributeHoursByBusinessDays(totalHours: number): Map<string, number> {
    const monthlyAvailableHours = this.getAvailableHoursByMonth();
    const totalAvailableHours = Array.from(monthlyAvailableHours.values()).reduce((sum, hours) => sum + hours, 0);

    if (totalAvailableHours === 0) {
      // 稼働可能時間がない場合は、開始月に全工数を計上
      const startYearMonth = this.formatYearMonth(this.startDate);
      return new Map([[startYearMonth, totalHours]]);
    }

    const distributedHours = new Map<string, number>();

    // 各月の稼働可能時間の比率で工数を案分
    monthlyAvailableHours.forEach((availableHours, yearMonth) => {
      const ratio = availableHours / totalAvailableHours;
      const allocatedHours = totalHours * ratio;
      distributedHours.set(yearMonth, Math.round(allocatedHours * 100) / 100); // 小数第2位まで
    });

    // 丸め誤差の調整（最後の月で調整）
    const allocatedTotal = Array.from(distributedHours.values()).reduce((sum, hours) => sum + hours, 0);
    const difference = totalHours - allocatedTotal;
    if (difference !== 0 && distributedHours.size > 0) {
      const lastMonth = Array.from(distributedHours.keys()).pop()!;
      const adjustedHours = distributedHours.get(lastMonth)! + difference;
      distributedHours.set(lastMonth, Math.round(adjustedHours * 100) / 100);
    }

    return distributedHours;
  }

  private formatYearMonth(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    return `${year}/${month}`;
  }
}