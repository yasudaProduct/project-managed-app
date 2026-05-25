import { BusinessDayPeriod } from '@/domains/calendar/business-day-period';
import { CompanyCalendar } from '@/domains/calendar/company-calendar';
import { WbsAssignee } from '@/domains/wbs/wbs-assignee';

describe('BusinessDayPeriod', () => {
  let companyCalendar: CompanyCalendar;
  let assignee: WbsAssignee;

  beforeEach(() => {
    companyCalendar = new CompanyCalendar(8);
    assignee = WbsAssignee.create({ wbsId: 1, userId: 'user-1', rate: 1.0 });
  });

  const createPeriod = (startDate: Date, endDate: Date) =>
    new BusinessDayPeriod(startDate, endDate, assignee, companyCalendar, []);

  describe('getBusinessDaysCount', () => {
    it('平日のみの1週間（月〜金）は5日を返す', () => {
      // 2026-05-25（月）〜2026-05-29（金）
      const period = createPeriod(new Date(2026, 4, 25), new Date(2026, 4, 29));
      expect(period.getBusinessDaysCount()).toBe(5);
    });

    it('土日を含む1週間は5日を返す', () => {
      // 2026-05-25（月）〜2026-05-31（日）
      const period = createPeriod(new Date(2026, 4, 25), new Date(2026, 4, 31));
      expect(period.getBusinessDaysCount()).toBe(5);
    });

    it('同日の期間は1日を返す（平日の場合）', () => {
      // 2026-05-25 は月曜日
      const period = createPeriod(new Date(2026, 4, 25), new Date(2026, 4, 25));
      expect(period.getBusinessDaysCount()).toBe(1);
    });

    it('同日の期間は0日を返す（土曜の場合）', () => {
      // 2026-05-23 は土曜日
      const period = createPeriod(new Date(2026, 4, 23), new Date(2026, 4, 23));
      expect(period.getBusinessDaysCount()).toBe(0);
    });

    it('祝日を含む期間は祝日を除外する', () => {
      // 2026-02-09（月）〜2026-02-13（金）、2026-02-11は建国記念の日
      const period = createPeriod(new Date(2026, 1, 9), new Date(2026, 1, 13));
      expect(period.getBusinessDaysCount()).toBe(4);
    });
  });

  describe('getBusinessDaysByMonth', () => {
    it('単一月の期間では1エントリのMapを返す', () => {
      // 2026-05-25（月）〜2026-05-29（金）
      const period = createPeriod(new Date(2026, 4, 25), new Date(2026, 4, 29));
      const result = period.getBusinessDaysByMonth();

      expect(result.size).toBe(1);
      expect(result.get('2026/05')).toBe(5);
    });

    it('月をまたぐ期間では月ごとに分割される', () => {
      // 2026-05-25（月）〜2026-06-05（金）
      const period = createPeriod(new Date(2026, 4, 25), new Date(2026, 5, 5));
      const result = period.getBusinessDaysByMonth();

      expect(result.size).toBe(2);
      expect(result.has('2026/05')).toBe(true);
      expect(result.has('2026/06')).toBe(true);
      // 5月: 25,26,27,28,29 = 5日
      expect(result.get('2026/05')).toBe(5);
      // 6月: 1,2,3,4,5 = 5日（1日は月曜日）
      expect(result.get('2026/06')).toBe(5);
    });

    it('稼働日がない月はMapに含まれない', () => {
      // 2026-05-23（土）〜2026-05-24（日）
      const period = createPeriod(new Date(2026, 4, 23), new Date(2026, 4, 24));
      const result = period.getBusinessDaysByMonth();

      expect(result.size).toBe(0);
    });
  });

  describe('getAvailableHoursByMonth', () => {
    it('単一月で予定なしの場合は営業日数 * 基準時間を返す', () => {
      // 2026-05-25（月）〜2026-05-29（金）= 5日
      const period = createPeriod(new Date(2026, 4, 25), new Date(2026, 4, 29));
      const result = period.getAvailableHoursByMonth();

      expect(result.get('2026/05')).toBe(40); // 5日 * 8時間
    });

    it('参画率0.5の担当者では基準時間が半分になる', () => {
      const halfAssignee = WbsAssignee.create({ wbsId: 1, userId: 'user-1', rate: 0.5 });
      const period = new BusinessDayPeriod(
        new Date(2026, 4, 25),
        new Date(2026, 4, 29),
        halfAssignee,
        companyCalendar,
        []
      );
      const result = period.getAvailableHoursByMonth();

      expect(result.get('2026/05')).toBe(20); // 5日 * 4時間
    });
  });

  describe('distributeHoursByBusinessDays', () => {
    it('単一月の期間では全工数がその月に計上される', () => {
      // 2026-05-25（月）〜2026-05-29（金）
      const period = createPeriod(new Date(2026, 4, 25), new Date(2026, 4, 29));
      const result = period.distributeHoursByBusinessDays(100);

      expect(result.size).toBe(1);
      expect(result.get('2026/05')).toBe(100);
    });

    it('複数月にまたがる期間では稼働可能時間の比率で按分される', () => {
      // 2026-05-25（月）〜2026-06-05（金）
      const period = createPeriod(new Date(2026, 4, 25), new Date(2026, 5, 5));
      const result = period.distributeHoursByBusinessDays(100);

      expect(result.size).toBe(2);
      // 両月とも5営業日 * 8時間 = 40時間ずつなので50:50で按分
      expect(result.get('2026/05')).toBe(50);
      expect(result.get('2026/06')).toBe(50);
    });

    it('按分合計が元の工数と一致する', () => {
      // 2026-01-05（月）〜2026-03-31（火）
      const period = createPeriod(new Date(2026, 0, 5), new Date(2026, 2, 31));
      const totalHours = 123.45;
      const result = period.distributeHoursByBusinessDays(totalHours);

      const allocatedTotal = Array.from(result.values()).reduce((sum, h) => sum + h, 0);
      expect(allocatedTotal).toBeCloseTo(totalHours, 2);
    });

    it('稼働可能時間がゼロの場合は開始月に全工数が計上される', () => {
      // 稼働率0の担当者
      const zeroAssignee = WbsAssignee.create({ wbsId: 1, userId: 'user-1', rate: 0 });
      const period = new BusinessDayPeriod(
        new Date(2026, 4, 25),
        new Date(2026, 5, 5),
        zeroAssignee,
        companyCalendar,
        []
      );
      const result = period.distributeHoursByBusinessDays(100);

      expect(result.size).toBe(1);
      expect(result.get('2026/05')).toBe(100);
    });

    it('工数0の按分は全月0になる', () => {
      const period = createPeriod(new Date(2026, 4, 25), new Date(2026, 5, 5));
      const result = period.distributeHoursByBusinessDays(0);

      result.forEach((hours) => {
        expect(hours).toBe(0);
      });
    });
  });
});
