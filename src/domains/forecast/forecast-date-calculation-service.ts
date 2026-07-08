/**
 * 見通し日付計算サービス
 * 残り見通し工数（見通し工数 − 実績工数）を基準稼働時間/日で
 * 営業日ごとに消化する想定で、見通し終了日を算出する。
 * 見通し工数自体の算出は ForecastCalculationService（docs/specs/03-forecast-calculation.md）が担う。
 */

import { addDays, startOfDay } from "date-fns";
import { CompanyCalendar } from "@/domains/calendar/company-calendar";

export interface ForecastEndDateInput {
  /** 見通し工数（時間） */
  forecastHours: number;
  /** 実績工数（時間） */
  actualHours: number;
  /** 消化を開始する基準日（通常は「今日」）。時刻成分は無視する */
  baseDate: Date;
}

export class ForecastDateCalculationService {
  /** 終了日探索の上限日数（異常データによる無限ループ防止） */
  static readonly MAX_LOOKAHEAD_DAYS = 3650;

  /**
   * 残り見通し工数を算出する
   */
  static calculateRemainingHours(
    forecastHours: number,
    actualHours: number
  ): number {
    return Math.max(0, forecastHours - actualHours);
  }

  /**
   * 見通し終了日を算出する
   * @param input 見通し工数・実績工数・基準日
   * @param calendar 会社カレンダー（営業日判定・基準稼働時間）
   * @returns 残工数を消化し終える営業日。残工数が0以下の場合は null
   * @description
   * 基準日から1日ずつ進め、営業日ごとに基準稼働時間分を消化し、
   * 残工数が尽きた営業日を終了日として返す。基準日が営業日なら当日から消化する。
   * MAX_LOOKAHEAD_DAYS を超える場合は最後に消化した営業日で打ち切る。
   */
  static calculateForecastEndDate(
    input: ForecastEndDateInput,
    calendar: CompanyCalendar
  ): Date | null {
    let remaining = this.calculateRemainingHours(
      input.forecastHours,
      input.actualHours
    );
    if (remaining <= 0) {
      return null;
    }

    const hoursPerDay = calendar.getStandardWorkingHours();
    let current = startOfDay(input.baseDate);
    let lastBusinessDay: Date | null = null;

    for (let i = 0; i <= ForecastDateCalculationService.MAX_LOOKAHEAD_DAYS; i++) {
      if (!calendar.isCompanyHoliday(current)) {
        remaining -= hoursPerDay;
        lastBusinessDay = current;
        if (remaining <= 0) {
          return current;
        }
      }
      current = addDays(current, 1);
    }

    // 上限到達時は最後に消化した営業日で打ち切る
    return lastBusinessDay;
  }
}
