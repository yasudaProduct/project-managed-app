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

export class AssigneeWorkingCalendar {
  constructor(
    private readonly assignee: WbsAssignee,
    private readonly companyCalendar: CompanyCalendar,
    private readonly userSchedules: UserSchedule[]
  ) {}

  isWorkingDay(date: Date): boolean {
    // 1. 会社既定の休日チェック
    if (this.companyCalendar.isCompanyHoliday(date)) {
      return false;
    }

    // 2. 担当者個人の休暇・予定チェック
    const userSchedule = this.getUserScheduleForDate(date);
    if (userSchedule && this.isFullDayOff(userSchedule)) {
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
   * @param date 
   * @returns 
   * @description 稼働可能時間 = 基準時間 - 個人予定
   */
  getAvailableHours(date: Date): number {
    if (!this.isWorkingDay(date)) {
      return 0;
    }

    // 基準時間
    const standardHours = this.companyCalendar.getStandardWorkingHours();

    // ユーザースケジュールによる減算
    const userSchedule = this.getUserScheduleForDate(date);
    const scheduledHours = userSchedule ? this.getScheduledHours(userSchedule) : 0;

    const availableHours = Math.max(0, standardHours - scheduledHours);
    return availableHours;
  }

  private getUserScheduleForDate(date: Date): UserSchedule | undefined {
    const dateString = this.formatDateString(date);
    return this.userSchedules.find(schedule => {
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

  private formatDateString(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}