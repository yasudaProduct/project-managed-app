import { WbsImportSchedule } from '@/domains/import-schedule/wbs-import-schedule';
import { DEFAULT_IMPORT_SCHEDULE_CRON, IMPORT_SCHEDULE_TIMEZONE } from '@/types/import-schedule';

/**
 * WBSごとの定期インポート設定。
 * 入力・期待値は UTC の ISO 8601 で記述する（実行タイミングは JST で解釈される）。
 */
describe('WbsImportSchedule', () => {
  // 2026-10-24 10:00 JST
  const NOW = new Date('2026-10-24T01:00:00.000Z');

  const enabledSettings = {
    isEnabled: true,
    cronExpression: '0 9,12,17 * * *',
    syncMode: 'diff' as const,
    includeActuals: true,
  };

  describe('createDefault', () => {
    it('未設定のWBSは「無効・毎日3:00・差分・実績なし」', () => {
      const schedule = WbsImportSchedule.createDefault(1);

      expect(schedule.wbsId).toBe(1);
      expect(schedule.isEnabled).toBe(false);
      expect(schedule.cronExpression).toBe(DEFAULT_IMPORT_SCHEDULE_CRON);
      expect(schedule.cronExpression).toBe('0 3 * * *');
      expect(schedule.timezone).toBe(IMPORT_SCHEDULE_TIMEZONE);
      expect(schedule.syncMode).toBe('diff');
      expect(schedule.includeActuals).toBe(false);
      expect(schedule.nextRunAt).toBeNull();
      expect(schedule.lastRunAt).toBeNull();
    });
  });

  describe('create', () => {
    it('有効な設定は、現在時刻より後の最初の実行日時を次回実行日時にする', () => {
      const schedule = WbsImportSchedule.create(1, enabledSettings, NOW);

      expect(schedule.isEnabled).toBe(true);
      expect(schedule.timezone).toBe('Asia/Tokyo');
      expect(schedule.nextRunAt?.toISOString()).toBe('2026-10-24T03:00:00.000Z'); // 12:00 JST
      expect(schedule.lastRunAt).toBeNull();
    });

    it('無効な設定は次回実行日時を持たない', () => {
      const schedule = WbsImportSchedule.create(1, { ...enabledSettings, isEnabled: false }, NOW);

      expect(schedule.nextRunAt).toBeNull();
    });

    it('不正な cron 式は例外', () => {
      expect(() => WbsImportSchedule.create(1, { ...enabledSettings, cronExpression: 'x' }, NOW)).toThrow(
        '実行タイミングの指定が不正です'
      );
    });
  });

  describe('changeSettings', () => {
    it('設定を変更すると次回実行日時を計算し直し、前回実行日時は保持する', () => {
      const lastRunAt = new Date('2026-10-23T18:00:00.000Z');
      const current = WbsImportSchedule.createFromDb({
        wbsId: 1,
        isEnabled: true,
        cronExpression: '0 3 * * *',
        timezone: 'Asia/Tokyo',
        syncMode: 'diff',
        includeActuals: false,
        nextRunAt: new Date('2026-10-24T18:00:00.000Z'),
        lastRunAt,
      });

      const changed = current.changeSettings({ ...enabledSettings, cronExpression: '0 * * * *', syncMode: 'replace' }, NOW);

      expect(changed.cronExpression).toBe('0 * * * *');
      expect(changed.syncMode).toBe('replace');
      expect(changed.includeActuals).toBe(true);
      expect(changed.nextRunAt?.toISOString()).toBe('2026-10-24T02:00:00.000Z');
      expect(changed.lastRunAt).toEqual(lastRunAt);
    });

    it('無効にすると次回実行日時はなくなる', () => {
      const current = WbsImportSchedule.create(1, enabledSettings, NOW);

      expect(current.changeSettings({ ...enabledSettings, isEnabled: false }, NOW).nextRunAt).toBeNull();
    });
  });

  describe('isDue', () => {
    const schedule = WbsImportSchedule.create(1, enabledSettings, NOW); // 次回 12:00 JST

    it('次回実行日時を過ぎていれば true', () => {
      expect(schedule.isDue(new Date('2026-10-24T03:00:00.000Z'))).toBe(true);
      expect(schedule.isDue(new Date('2026-10-24T03:00:30.000Z'))).toBe(true);
    });

    it('次回実行日時より前なら false', () => {
      expect(schedule.isDue(new Date('2026-10-24T02:59:59.000Z'))).toBe(false);
    });

    it('無効な設定は false', () => {
      const disabled = schedule.changeSettings({ ...enabledSettings, isEnabled: false }, NOW);

      expect(disabled.isDue(new Date('2026-10-30T00:00:00.000Z'))).toBe(false);
    });
  });

  describe('markRun / skipRun', () => {
    const schedule = WbsImportSchedule.create(1, enabledSettings, NOW); // 次回 12:00 JST

    it('markRun: 前回実行日時を記録し、次回実行日時を実行時刻より後へ進める', () => {
      const runAt = new Date('2026-10-24T03:00:05.000Z');
      const ran = schedule.markRun(runAt);

      expect(ran.lastRunAt).toEqual(runAt);
      expect(ran.nextRunAt?.toISOString()).toBe('2026-10-24T08:00:00.000Z'); // 17:00 JST
    });

    it('markRun: cron が止まっていて実行を逃した場合も、過去分は遡らず1回だけ実行して次の予定へ進める', () => {
      const runAt = new Date('2026-10-26T01:00:00.000Z'); // 2日後の 10:00 JST
      const ran = schedule.markRun(runAt);

      expect(ran.nextRunAt?.toISOString()).toBe('2026-10-26T03:00:00.000Z');
    });

    it('skipRun: 実行せずに次回実行日時だけ進める（前回実行日時は変えない）', () => {
      const skipped = schedule.skipRun(new Date('2026-10-24T03:00:05.000Z'));

      expect(skipped.lastRunAt).toBeNull();
      expect(skipped.nextRunAt?.toISOString()).toBe('2026-10-24T08:00:00.000Z');
    });

    it('元の設定は変更しない', () => {
      schedule.markRun(new Date('2026-10-24T03:00:05.000Z'));

      expect(schedule.nextRunAt?.toISOString()).toBe('2026-10-24T03:00:00.000Z');
      expect(schedule.lastRunAt).toBeNull();
    });
  });

  describe('actualsTargetMonths - 実績（Geppo）の取込対象月', () => {
    const schedule = WbsImportSchedule.create(1, enabledSettings, NOW);

    it('JST の前月・当月（YYYY-MM）を古い順に返す', () => {
      expect(schedule.actualsTargetMonths(NOW)).toEqual(['2026-09', '2026-10']);
    });

    it('UTC ではまだ前月でも、JST で月が変わっていれば JST の月を基準にする', () => {
      // 2026-11-01 00:30 JST = 2026-10-31T15:30Z
      expect(schedule.actualsTargetMonths(new Date('2026-10-31T15:30:00.000Z'))).toEqual(['2026-10', '2026-11']);
    });

    it('1月は前年12月と当月', () => {
      // 2027-01-01 03:00 JST
      expect(schedule.actualsTargetMonths(new Date('2026-12-31T18:00:00.000Z'))).toEqual(['2026-12', '2027-01']);
    });
  });
});
