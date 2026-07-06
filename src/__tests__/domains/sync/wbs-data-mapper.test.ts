import { WbsDataMapper } from '@/domains/sync/wbs-data-mapper';
import { ExcelWbs } from '@/domains/sync/excel-wbs';

function createExcelWbs(overrides?: Partial<ExcelWbs>): ExcelWbs {
  return {
    ROW_NO: 1,
    PROJECT_ID: 'proj-1',
    WBS_ID: 'WBS-001',
    PHASE: '設計',
    ACTIVITY: '基本設計',
    TASK: '画面設計',
    TANTO: '田中',
    TANTO_REV: null,
    KIJUN_START_DATE: null,
    KIJUN_END_DATE: null,
    YOTEI_START_DATE: null,
    YOTEI_END_DATE: null,
    JISSEKI_START_DATE: null,
    JISSEKI_END_DATE: null,
    KIJUN_KOSU: null,
    YOTEI_KOSU: null,
    JISSEKI_KOSU: null,
    KIJUN_KOSU_BUFFER: null,
    STATUS: null,
    BIKO: null,
    PROGRESS_RATE: null,
    ...overrides,
  };
}

describe('WbsDataMapper', () => {
  describe('toAppWbs - ステータスマッピング', () => {
    it('未着手 → NOT_STARTED', () => {
      const result = WbsDataMapper.toAppWbs(createExcelWbs({ STATUS: '未着手' }));
      expect(result.task.status).toBe('NOT_STARTED');
    });

    it('着手中 → IN_PROGRESS', () => {
      const result = WbsDataMapper.toAppWbs(createExcelWbs({ STATUS: '着手中' }));
      expect(result.task.status).toBe('IN_PROGRESS');
    });

    it('完了 → COMPLETED', () => {
      const result = WbsDataMapper.toAppWbs(createExcelWbs({ STATUS: '完了' }));
      expect(result.task.status).toBe('COMPLETED');
    });

    it('null → NOT_STARTED（デフォルト）', () => {
      const result = WbsDataMapper.toAppWbs(createExcelWbs({ STATUS: null }));
      expect(result.task.status).toBe('NOT_STARTED');
    });

    it('未知のステータス → NOT_STARTED（デフォルト）', () => {
      const result = WbsDataMapper.toAppWbs(createExcelWbs({ STATUS: '保留中' }));
      expect(result.task.status).toBe('NOT_STARTED');
    });
  });

  describe('toAppWbs - 進捗率マッピング', () => {
    it('正常な値がそのまま返される', () => {
      const result = WbsDataMapper.toAppWbs(createExcelWbs({ PROGRESS_RATE: 50 }));
      expect(result.task.progressRate).toBe(50);
    });

    it('null → undefined', () => {
      const result = WbsDataMapper.toAppWbs(createExcelWbs({ PROGRESS_RATE: null }));
      expect(result.task.progressRate).toBeUndefined();
    });

    it('負の値は 0 にクランプ', () => {
      const result = WbsDataMapper.toAppWbs(createExcelWbs({ PROGRESS_RATE: -10 }));
      expect(result.task.progressRate).toBe(0);
    });

    it('100超の値は 100 にクランプ', () => {
      const result = WbsDataMapper.toAppWbs(createExcelWbs({ PROGRESS_RATE: 150 }));
      expect(result.task.progressRate).toBe(100);
    });

    it('0 はそのまま 0', () => {
      const result = WbsDataMapper.toAppWbs(createExcelWbs({ PROGRESS_RATE: 0 }));
      expect(result.task.progressRate).toBe(0);
    });

    it('100 はそのまま 100', () => {
      const result = WbsDataMapper.toAppWbs(createExcelWbs({ PROGRESS_RATE: 100 }));
      expect(result.task.progressRate).toBe(100);
    });
  });

  describe('toAppWbs - タスク名/WBS_ID', () => {
    it('ACTIVITY + TASK が name に設定される', () => {
      const result = WbsDataMapper.toAppWbs(createExcelWbs({ ACTIVITY: '基本設計', TASK: '画面設計' }));
      expect(result.task.name).toBe('基本設計画面設計');
    });

    it('ACTIVITY が null の場合、TASK のみが name になる（"null" が混入しない）', () => {
      const result = WbsDataMapper.toAppWbs(createExcelWbs({ ACTIVITY: null, TASK: '画面設計' }));
      expect(result.task.name).toBe('画面設計');
    });

    it('TASK が null の場合、ACTIVITY のみが name になる（"null" が混入しない）', () => {
      const result = WbsDataMapper.toAppWbs(createExcelWbs({ ACTIVITY: '基本設計', TASK: null }));
      expect(result.task.name).toBe('基本設計');
    });

    it('ACTIVITY と TASK が両方 null の場合、name は undefined（"nullnull" にならない）', () => {
      const result = WbsDataMapper.toAppWbs(createExcelWbs({ ACTIVITY: null, TASK: null }));
      expect(result.task.name).toBeUndefined();
    });

    it('WBS_ID が taskNo に設定される', () => {
      const result = WbsDataMapper.toAppWbs(createExcelWbs({ WBS_ID: 'WBS-042' }));
      expect(result.task.taskNo).toBe('WBS-042');
    });

    it('WBS_ID が空文字の場合は undefined', () => {
      const result = WbsDataMapper.toAppWbs(createExcelWbs({ WBS_ID: '' }));
      expect(result.task.taskNo).toBeUndefined();
    });
  });

  describe('toAppWbs - 期間マッピング（基準日程）', () => {
    it('基準開始日・終了日が設定されている場合、KIJUN期間が生成される', () => {
      const result = WbsDataMapper.toAppWbs(createExcelWbs({
        KIJUN_START_DATE: new Date('2025-01-01'),
        KIJUN_END_DATE: new Date('2025-03-31'),
        KIJUN_KOSU: 100,
      }));

      const kijunPeriod = result.periods.find(p => p.type.type === 'KIJUN');
      expect(kijunPeriod).toBeDefined();
      expect(kijunPeriod!.startDate).toEqual(new Date('2025-01-01'));
      expect(kijunPeriod!.endDate).toEqual(new Date('2025-03-31'));
      expect(kijunPeriod!.manHours).toHaveLength(1);
      expect(kijunPeriod!.manHours[0].kosu).toBe(100);
    });

    it('KIJUN_KOSU_BUFFER が設定されている場合、RISK工数も含まれる', () => {
      const result = WbsDataMapper.toAppWbs(createExcelWbs({
        KIJUN_START_DATE: new Date('2025-01-01'),
        KIJUN_END_DATE: new Date('2025-03-31'),
        KIJUN_KOSU: 100,
        KIJUN_KOSU_BUFFER: 20,
      }));

      const kijunPeriod = result.periods.find(p => p.type.type === 'KIJUN');
      expect(kijunPeriod!.manHours).toHaveLength(2);
      const normalHour = kijunPeriod!.manHours.find(m => m.type.type === 'NORMAL');
      const riskHour = kijunPeriod!.manHours.find(m => m.type.type === 'RISK');
      expect(normalHour!.kosu).toBe(100);
      expect(riskHour!.kosu).toBe(20);
    });

    it('基準開始日のみで終了日がない場合、KIJUN期間は生成されない', () => {
      const result = WbsDataMapper.toAppWbs(createExcelWbs({
        KIJUN_START_DATE: new Date('2025-01-01'),
        KIJUN_END_DATE: null,
      }));

      const kijunPeriod = result.periods.find(p => p.type.type === 'KIJUN');
      expect(kijunPeriod).toBeUndefined();
    });

    it('KIJUN_KOSU が null の場合、工数なしの期間が生成される', () => {
      const result = WbsDataMapper.toAppWbs(createExcelWbs({
        KIJUN_START_DATE: new Date('2025-01-01'),
        KIJUN_END_DATE: new Date('2025-03-31'),
        KIJUN_KOSU: null,
      }));

      const kijunPeriod = result.periods.find(p => p.type.type === 'KIJUN');
      expect(kijunPeriod).toBeDefined();
      expect(kijunPeriod!.manHours).toHaveLength(0);
    });
  });

  describe('toAppWbs - 期間マッピング（予定日程）', () => {
    it('予定開始日・終了日が設定されている場合、YOTEI期間が生成される', () => {
      const result = WbsDataMapper.toAppWbs(createExcelWbs({
        YOTEI_START_DATE: new Date('2025-04-01'),
        YOTEI_END_DATE: new Date('2025-06-30'),
        YOTEI_KOSU: 80,
      }));

      const yoteiPeriod = result.periods.find(p => p.type.type === 'YOTEI');
      expect(yoteiPeriod).toBeDefined();
      expect(yoteiPeriod!.manHours).toHaveLength(1);
      expect(yoteiPeriod!.manHours[0].kosu).toBe(80);
    });

    it('予定日程と基準日程が両方設定されている場合、2つの期間が返される', () => {
      const result = WbsDataMapper.toAppWbs(createExcelWbs({
        KIJUN_START_DATE: new Date('2025-01-01'),
        KIJUN_END_DATE: new Date('2025-03-31'),
        KIJUN_KOSU: 100,
        YOTEI_START_DATE: new Date('2025-04-01'),
        YOTEI_END_DATE: new Date('2025-06-30'),
        YOTEI_KOSU: 80,
      }));

      expect(result.periods).toHaveLength(2);
      expect(result.periods.map(p => p.type.type)).toEqual(expect.arrayContaining(['KIJUN', 'YOTEI']));
    });

    it('日程が全く未設定の場合、期間は空配列', () => {
      const result = WbsDataMapper.toAppWbs(createExcelWbs());
      expect(result.periods).toHaveLength(0);
    });
  });
});
