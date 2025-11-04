import { CompanyCalendar } from './company-calendar';
import { WbsAssignee } from '../wbs/wbs-assignee';
import { AssigneeGanttCalculationOptions } from '../../types/project-settings';

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
    private readonly userSchedules: UserSchedule[],
    private readonly calculationOptions: AssigneeGanttCalculationOptions
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

    // 2. 担当者の稼働率チェック（個人予定では非稼働にしない）
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
    // 稼働可能な日でない場合は0を返す
    if (!this.isWorkingDay(date)) {
      return 0;
    }

    // 基準時間（設定値を使用）
    const standardHours = this.calculationOptions.standardWorkingHours;

    // ユーザースケジュールによる減算（設定により有効/無効）
    let scheduledHours = 0;
    if (this.calculationOptions.considerPersonalSchedule) {
      const userSchedule = this.getUserScheduleForDate(date);
      // 除外パターンは差し引かない。考慮対象のみ差し引く。
      scheduledHours =
        userSchedule && this.isScheduleConsidered(userSchedule)
          ? this.getScheduledHours(userSchedule)
          : 0;
    }

    // 稼働可能時間 = 基準時間 - 個人予定の時間
    const availableHours = Math.max(0, standardHours - scheduledHours);
    return availableHours;
  }

  /**
   * 日付に対応する個人予定を取得
   * @param date 日付
   * @returns 個人予定
   */
  private getUserScheduleForDate(date: Date): UserSchedule | undefined {
    const dateString = this.formatDateString(date);
    return this.userSchedules.find(schedule => {
      const scheduleDate = this.formatDateString(schedule.date);
      return scheduleDate === dateString && schedule.userId === this.assignee.userId;
    });
  }

  /**
   * スケジュールが考慮対象かを判定（新しいパターンマッチング機能）
   * @param schedule 個人予定
   * @returns 考慮対象の場合はtrue
   */
  private isScheduleConsidered(schedule: UserSchedule): boolean {
    // 除外パターンにマッチする場合は考慮しない
    if (this.matchesPatterns(schedule.title, this.calculationOptions.scheduleExcludePatterns)) {

      return false;
    }

    // 含有パターンにマッチする場合は考慮する
    return this.matchesPatterns(schedule.title, this.calculationOptions.scheduleIncludePatterns);
  }

  /**
   * パターンマッチング
   * @param text マッチ対象の文字列
   * @param patterns パターン配列
   * @returns マッチした場合はtrue
   */
  private matchesPatterns(text: string, patterns: string[]): boolean {
    return patterns.some(pattern => {
      switch (this.calculationOptions.scheduleMatchType) {
        case 'EXACT':
          return text === pattern;
        case 'CONTAINS':
          return text.includes(pattern);
        case 'REGEX':
          try {
            const regex = new RegExp(pattern);
            return regex.test(text);
          } catch {
            // 正規表現が無効な場合は部分一致で処理
            return text.includes(pattern);
          }
        default:
          return text.includes(pattern);
      }
    });
  }

  // 全日休暇の判定（後方互換性のため残す）
  private isFullDayOff(schedule: UserSchedule): boolean {
    return this.isScheduleConsidered(schedule);
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
      return this.calculationOptions.standardWorkingHours;
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