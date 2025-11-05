import { CompanyCalendar } from './company-calendar';
import { WbsAssignee } from '../wbs/wbs-assignee';

export interface UserSchedule {
  id: number;
  userId: string;
  date: Date;
  startTime: string;
  endTime: string;
  title: string;
  location?: string;
  description?: string;
}

/**
 * 担当者の稼働カレンダー
 * @description 担当者の稼働カレンダーは、担当者固有の稼働時間・休暇と会社既定の休日を考慮した稼働可能時間を計算するクラスです。
 */
export class AssigneeWorkingCalendar {
  constructor(
    private readonly assignee: WbsAssignee,
    private readonly companyCalendar: CompanyCalendar,
    private readonly userSchedules: UserSchedule[]
  ) { }

  /**
   * 稼働可能な日かを判定
   * @param date 日付（YYYY-MM-DD）
   * @returns 稼働可能な日の場合はtrue、それ以外はfalse
   */
  isWorkingDay(date: Date): boolean {
    // 1. 会社既定の休日チェック
    if (this.companyCalendar.isCompanyHoliday(date)) {
      return false;
    }

    // 2. 担当者個人の休暇・予定チェック
    const userSchedules = this.getUserScheduleForDate(date);
    if (userSchedules.some(s => this.isFullDayOff(s))) {
      return false;
    }

    // 3. 担当者の稼働率チェック
    if (this.assignee.getRate() === 0) {
      return false;
    }

    return true;
  }

  /**
   * 稼働可能時間を取得
   * @param date 日付
   * @returns 稼働可能時間
   */
  getAvailableHours(date: Date): number {
    if (!this.isWorkingDay(date)) {
      return 0;
    }

    // 基準時間
    const standardHours = this.companyCalendar.getStandardWorkingHours();

    // ユーザースケジュールによる減算
    const userSchedules = this.getUserScheduleForDate(date);
    const scheduledHours = this.sumScheduledHours(userSchedules, standardHours);

    // 個人予定控除後の時間 = 基準時間 - 個人予定の時間
    const rawAvailable = Math.max(0, standardHours - scheduledHours);

    //　参画率に基づく上限
    const rateCapHours = standardHours * this.assignee.getRate();

    // 稼働可能時間 = min(個人予定控除後, 参画率上限)
    const availableHours = Math.min(rawAvailable, rateCapHours);

    return availableHours;
  }

  /**
   * 日付に対応する個人予定を取得
   * @param date 日付
   * @returns 個人予定
   */
  private getUserScheduleForDate(date: Date): UserSchedule[] {
    const dateString = this.formatDateString(date);
    return this.userSchedules.filter(schedule => {
      const scheduleDate = this.formatDateString(schedule.date);
      return scheduleDate === dateString && schedule.userId === this.assignee.userId;
    });
  }

  // 全日休暇の判定
  private isFullDayOff(schedule: UserSchedule): boolean {
    // タイトルに固定文字が含まれる場合を全日休みとする
    const offKeywords = ['休暇', '有給', '休み', '全休', '代休', '振休', '有給休暇']; // TODO:設定から動的にする
    return offKeywords.some(keyword => schedule.title === keyword);
  }

  /**
   * 個人予定の時間を取得
   * @param schedule 
   * @returns 
   * @description 個人予定の時間 = 基準時間 / 2（半休） or 基準時間（全日休暇） or 開始時間と終了時間から計算
   */
  private getScheduledHours(schedule: UserSchedule): number {
    // 半日休暇の判定
    // TODO:半休の場合のUserScheduleのformatを確認する。schedule.startTimeとschedule.endTimeが入る場合以下の処理は不要？
    // if (schedule.title.includes('半休') || schedule.title.includes('午前休') || schedule.title.includes('午後休')) {
    //   return this.companyCalendar.getStandardWorkingHours() / 2;
    // }

    // 全日休暇の判定 休暇の場合は基準時間を返す
    if (this.isFullDayOff(schedule)) {
      return this.companyCalendar.getStandardWorkingHours();
    }

    // 開始時間と終了時間から計算（フォーマット: "HH:mm"） // TODO: UserScheduleに持たせても良いのでは？
    try {
      const startHour = parseInt(schedule.startTime.split(':')[0]);
      const startMin = parseInt(schedule.startTime.split(':')[1]);
      const endHour = parseInt(schedule.endTime.split(':')[0]);
      const endMin = parseInt(schedule.endTime.split(':')[1]);

      const hours = (endHour + endMin / 60) - (startHour + startMin / 60);
      return Math.max(0, hours);
    } catch {
      return 0;
    }
  }

  // 同日の予定合計時間（全休があれば基準時間、過剰加算は基準時間で打ち止め）
  private sumScheduledHours(schedules: UserSchedule[], capHours: number): number {
    if (schedules.length === 0) return 0;
    if (schedules.some(s => this.isFullDayOff(s))) return capHours;

    const total = schedules
      .map(s => this.getScheduledHours(s))
      .filter(h => Number.isFinite(h) && h > 0)
      .reduce((a, b) => a + b, 0);

    return Math.min(capHours, total);
  }

  private formatDateString(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}