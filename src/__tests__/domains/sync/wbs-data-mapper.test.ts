import { WbsDataMapper } from '@/domains/sync/WbsDataMapper';
import type { ExcelWbs } from '@/domains/sync/ExcelWbs';

describe('WbsDataMapper', () => {
  const createExcelWbs = (overrides: Partial<ExcelWbs> = {}): ExcelWbs => ({
    ROW_NO: 1,
    PROJECT_ID: 'proj-1',
    WBS_ID: 'WBS-001',
    PHASE: '設計',
    ACTIVITY: 'Activity-1',
    TASK: 'Task-1',
    TANTO: 'user-1',
    KIJUN_START_DATE: new Date('2026-01-01T00:00:00.000Z'),
    KIJUN_END_DATE: new Date('2026-01-31T00:00:00.000Z'),
    YOTEI_START_DATE: new Date('2026-01-05T00:00:00.000Z'),
    YOTEI_END_DATE: new Date('2026-02-05T00:00:00.000Z'),
    JISSEKI_START_DATE: null,
    JISSEKI_END_DATE: null,
    KIJUN_KOSU: 40,
    YOTEI_KOSU: 35,
    JISSEKI_KOSU: null,
    KIJUN_KOSU_BUFFER: 10,
    STATUS: '着手中',
    BIKO: null,
    PROGRESS_RATE: 50,
    ...overrides,
  });

  describe('toAppWbs', () => {
    it('ExcelWbsをタスクとPeriodsに変換する', () => {
      const excelWbs = createExcelWbs();
      const result = WbsDataMapper.toAppWbs(excelWbs);

      expect(result.task.taskNo).toBe('WBS-001');
      expect(result.task.name).toBe('Activity-1Task-1');
      expect(result.task.status).toBe('IN_PROGRESS');
      expect(result.task.progressRate).toBe(50);
    });

    it('基準日程と予定日程のPeriodsを生成する', () => {
      const excelWbs = createExcelWbs();
      const result = WbsDataMapper.toAppWbs(excelWbs);

      expect(result.periods).toHaveLength(2);
      expect(result.periods[0].type.type).toBe('KIJUN');
      expect(result.periods[1].type.type).toBe('YOTEI');
    });

    it('基準日程に通常工数とリスク工数を含める', () => {
      const excelWbs = createExcelWbs({
        KIJUN_KOSU: 40,
        KIJUN_KOSU_BUFFER: 10,
      });
      const result = WbsDataMapper.toAppWbs(excelWbs);

      const kijunPeriod = result.periods.find(p => p.type.type === 'KIJUN');
      expect(kijunPeriod?.manHours).toHaveLength(2);
    });

    it('工数がnullの場合はManHourを生成しない', () => {
      const excelWbs = createExcelWbs({
        KIJUN_KOSU: null,
        KIJUN_KOSU_BUFFER: null,
      });
      const result = WbsDataMapper.toAppWbs(excelWbs);

      const kijunPeriod = result.periods.find(p => p.type.type === 'KIJUN');
      expect(kijunPeriod?.manHours).toHaveLength(0);
    });

    it('基準日程がない場合はPeriodsに含めない', () => {
      const excelWbs = createExcelWbs({
        KIJUN_START_DATE: null,
        KIJUN_END_DATE: null,
      });
      const result = WbsDataMapper.toAppWbs(excelWbs);

      expect(result.periods).toHaveLength(1);
      expect(result.periods[0].type.type).toBe('YOTEI');
    });

    it('予定日程がない場合はPeriodsに含めない', () => {
      const excelWbs = createExcelWbs({
        YOTEI_START_DATE: null,
        YOTEI_END_DATE: null,
      });
      const result = WbsDataMapper.toAppWbs(excelWbs);

      expect(result.periods).toHaveLength(1);
      expect(result.periods[0].type.type).toBe('KIJUN');
    });

    it('両日程がない場合はPeriodsが空配列', () => {
      const excelWbs = createExcelWbs({
        KIJUN_START_DATE: null,
        KIJUN_END_DATE: null,
        YOTEI_START_DATE: null,
        YOTEI_END_DATE: null,
      });
      const result = WbsDataMapper.toAppWbs(excelWbs);

      expect(result.periods).toHaveLength(0);
    });
  });

  describe('ステータスマッピング', () => {
    it.each([
      ['未着手', 'NOT_STARTED'],
      ['着手中', 'IN_PROGRESS'],
      ['完了', 'COMPLETED'],
    ])('"%s" を "%s" に変換する', (input, expected) => {
      const excelWbs = createExcelWbs({ STATUS: input });
      const result = WbsDataMapper.toAppWbs(excelWbs);

      expect(result.task.status).toBe(expected);
    });

    it('不明なステータスはNOT_STARTEDにフォールバックする', () => {
      const excelWbs = createExcelWbs({ STATUS: '不明なステータス' });
      const result = WbsDataMapper.toAppWbs(excelWbs);

      expect(result.task.status).toBe('NOT_STARTED');
    });

    it('nullステータスはNOT_STARTEDにフォールバックする', () => {
      const excelWbs = createExcelWbs({ STATUS: null });
      const result = WbsDataMapper.toAppWbs(excelWbs);

      expect(result.task.status).toBe('NOT_STARTED');
    });
  });

  describe('進捗率マッピング', () => {
    it('nullの場合undefinedを返す', () => {
      const excelWbs = createExcelWbs({ PROGRESS_RATE: null });
      const result = WbsDataMapper.toAppWbs(excelWbs);

      expect(result.task.progressRate).toBeUndefined();
    });

    it('0-100の範囲内の値はそのまま返す', () => {
      const excelWbs = createExcelWbs({ PROGRESS_RATE: 75 });
      const result = WbsDataMapper.toAppWbs(excelWbs);

      expect(result.task.progressRate).toBe(75);
    });

    it('100を超える値は100にクランプされる', () => {
      const excelWbs = createExcelWbs({ PROGRESS_RATE: 150 });
      const result = WbsDataMapper.toAppWbs(excelWbs);

      expect(result.task.progressRate).toBe(100);
    });

    it('負の値は0にクランプされる', () => {
      const excelWbs = createExcelWbs({ PROGRESS_RATE: -10 });
      const result = WbsDataMapper.toAppWbs(excelWbs);

      expect(result.task.progressRate).toBe(0);
    });
  });
});
