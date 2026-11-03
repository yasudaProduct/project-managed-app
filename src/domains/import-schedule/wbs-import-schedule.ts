import { ScheduleExpression } from './schedule-expression';
import { DEFAULT_IMPORT_SCHEDULE_CRON, IMPORT_SCHEDULE_TIMEZONE } from '@/types/import-schedule';
import type { WbsSyncMode } from '@/types/wbs-sync-mode';

export interface WbsImportScheduleSettings {
  isEnabled: boolean;
  cronExpression: string;
  syncMode: WbsSyncMode;
  includeActuals: boolean;
}

/**
 * WBSごとの定期インポート設定
 * 有効な間は nextRunAt（次回実行日時）を持ち、その時刻を過ぎると定期インポート（WBS同期、設定により実績取込）の対象になる
 */
export class WbsImportSchedule {
  private constructor(
    public readonly wbsId: number,
    public readonly isEnabled: boolean,
    private readonly expression: ScheduleExpression,
    public readonly syncMode: WbsSyncMode,
    public readonly includeActuals: boolean,
    public readonly nextRunAt: Date | null,
    public readonly lastRunAt: Date | null
  ) { }

  /** 未設定のWBSの既定値（無効・毎日3:00・差分・実績なし） */
  static createDefault(wbsId: number): WbsImportSchedule {
    return new WbsImportSchedule(
      wbsId,
      false,
      ScheduleExpression.create(DEFAULT_IMPORT_SCHEDULE_CRON, IMPORT_SCHEDULE_TIMEZONE),
      'diff',
      false,
      null,
      null
    );
  }

  static create(wbsId: number, settings: WbsImportScheduleSettings, now: Date): WbsImportSchedule {
    return WbsImportSchedule.createDefault(wbsId).changeSettings(settings, now);
  }

  static createFromDb(args: {
    wbsId: number;
    isEnabled: boolean;
    cronExpression: string;
    timezone: string;
    syncMode: WbsSyncMode;
    includeActuals: boolean;
    nextRunAt: Date | null;
    lastRunAt: Date | null;
  }): WbsImportSchedule {
    return new WbsImportSchedule(
      args.wbsId,
      args.isEnabled,
      ScheduleExpression.create(args.cronExpression, args.timezone),
      args.syncMode,
      args.includeActuals,
      args.nextRunAt,
      args.lastRunAt
    );
  }

  get cronExpression(): string {
    return this.expression.cronExpression;
  }

  get timezone(): string {
    return this.expression.timezone;
  }

  /** 設定を変更する（次回実行日時は now を基準に計算し直し、前回実行日時は保持する） */
  changeSettings(settings: WbsImportScheduleSettings, now: Date): WbsImportSchedule {
    const expression = ScheduleExpression.create(settings.cronExpression, IMPORT_SCHEDULE_TIMEZONE);
    return new WbsImportSchedule(
      this.wbsId,
      settings.isEnabled,
      expression,
      settings.syncMode,
      settings.includeActuals,
      settings.isEnabled ? expression.nextAfter(now) : null,
      this.lastRunAt
    );
  }

  isDue(now: Date): boolean {
    return this.isEnabled && this.nextRunAt !== null && this.nextRunAt.getTime() <= now.getTime();
  }

  /** 実行したことを記録し、次回実行日時を now より後へ進める（実行を逃した過去分は遡らない） */
  markRun(now: Date): WbsImportSchedule {
    return this.withRun(this.expression.nextAfter(now), now);
  }

  /** 実行せずに次回実行日時だけ now より後へ進める */
  skipRun(now: Date): WbsImportSchedule {
    return this.withRun(this.expression.nextAfter(now), this.lastRunAt);
  }

  /** 実績（Geppo）の取込対象月（YYYY-MM）。設定のタイムゾーンでの前月・当月を古い順に返す */
  actualsTargetMonths(now: Date): string[] {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: this.timezone,
      year: 'numeric',
      month: 'numeric',
    }).formatToParts(now);
    const year = Number(parts.find((part) => part.type === 'year')?.value);
    const month = Number(parts.find((part) => part.type === 'month')?.value);
    const previous = month === 1 ? { year: year - 1, month: 12 } : { year, month: month - 1 };

    return [previous, { year, month }].map(
      ({ year: y, month: m }) => `${y}-${String(m).padStart(2, '0')}`
    );
  }

  private withRun(nextRunAt: Date, lastRunAt: Date | null): WbsImportSchedule {
    return new WbsImportSchedule(
      this.wbsId,
      this.isEnabled,
      this.expression,
      this.syncMode,
      this.includeActuals,
      nextRunAt,
      lastRunAt
    );
  }
}
