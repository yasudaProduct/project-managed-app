import { CronExpressionParser } from 'cron-parser';

/**
 * 定期実行のタイミング（cron 式 + タイムゾーン）
 * cron 式は「分 時 日 月 曜日」の5フィールド。時刻はタイムゾーンの壁時計として解釈する（例: JST の 3:00）
 */
export class ScheduleExpression {
  private constructor(
    public readonly cronExpression: string,
    public readonly timezone: string
  ) { }

  static create(cronExpression: string, timezone: string): ScheduleExpression {
    if (!ScheduleExpression.isValidTimezone(timezone)) {
      throw new Error(`タイムゾーンの指定が不正です: ${timezone}`);
    }

    const normalized = cronExpression.trim();
    if (normalized.split(/\s+/).length !== 5) {
      throw new Error(`実行タイミングの指定が不正です: ${cronExpression}`);
    }
    try {
      CronExpressionParser.parse(normalized, { tz: timezone });
    } catch {
      throw new Error(`実行タイミングの指定が不正です: ${cronExpression}`);
    }

    return new ScheduleExpression(normalized, timezone);
  }

  /** from より後（from ちょうどは含まない）の最初の実行日時 */
  nextAfter(from: Date): Date {
    return CronExpressionParser.parse(this.cronExpression, { currentDate: from, tz: this.timezone })
      .next()
      .toDate();
  }

  private static isValidTimezone(timezone: string): boolean {
    try {
      new Intl.DateTimeFormat('en-US', { timeZone: timezone });
      return true;
    } catch {
      return false;
    }
  }
}
