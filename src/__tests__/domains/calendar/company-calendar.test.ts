import { CompanyCalendar, CompanyHoliday } from '@/domains/calendar/company-calendar';

describe('CompanyCalendar', () => {
  describe('コンストラクタ', () => {
    it('正の基準時間でインスタンスを作成できる', () => {
      const calendar = new CompanyCalendar(8);
      expect(calendar.getStandardWorkingHours()).toBe(8);
    });

    it('基準時間が0の場合エラーが発生する', () => {
      expect(() => new CompanyCalendar(0)).toThrow('standardWorkingHours must be positive');
    });

    it('基準時間が負の場合エラーが発生する', () => {
      expect(() => new CompanyCalendar(-1)).toThrow('standardWorkingHours must be positive');
    });

    it('会社休日を初期値として設定できる', () => {
      const holidays: CompanyHoliday[] = [
        { date: new Date('2026-12-29'), name: '年末休暇', type: 'COMPANY' },
      ];
      const calendar = new CompanyCalendar(8, holidays);
      expect(calendar.getCompanyHolidays()).toHaveLength(1);
    });
  });

  describe('isCompanyHoliday', () => {
    let calendar: CompanyCalendar;

    beforeEach(() => {
      calendar = new CompanyCalendar(8);
    });

    it('土曜日は休日と判定される', () => {
      // 2026-05-23 は土曜日
      expect(calendar.isCompanyHoliday(new Date(2026, 4, 23))).toBe(true);
    });

    it('日曜日は休日と判定される', () => {
      // 2026-05-24 は日曜日
      expect(calendar.isCompanyHoliday(new Date(2026, 4, 24))).toBe(true);
    });

    it('通常の平日は休日でないと判定される', () => {
      // 2026-05-25 は月曜日
      expect(calendar.isCompanyHoliday(new Date(2026, 4, 25))).toBe(false);
    });

    it('日本の祝日（元日）は休日と判定される', () => {
      // 2026-01-01 は元日（木曜日）
      expect(calendar.isCompanyHoliday(new Date(2026, 0, 1))).toBe(true);
    });

    it('日本の祝日（建国記念の日）は休日と判定される', () => {
      // 2026-02-11 は建国記念の日（水曜日）
      expect(calendar.isCompanyHoliday(new Date(2026, 1, 11))).toBe(true);
    });

    it('会社独自休日は休日と判定される', () => {
      const companyHoliday: CompanyHoliday = {
        date: new Date(2026, 11, 29), // 2026-12-29
        name: '年末休暇',
        type: 'COMPANY',
      };
      calendar.addCompanyHoliday(companyHoliday);

      expect(calendar.isCompanyHoliday(new Date(2026, 11, 29))).toBe(true);
    });

    it('会社独自休日に登録していない平日は休日でないと判定される', () => {
      const companyHoliday: CompanyHoliday = {
        date: new Date(2026, 11, 29),
        name: '年末休暇',
        type: 'COMPANY',
      };
      calendar.addCompanyHoliday(companyHoliday);

      // 2026-12-28 は月曜日で会社休日未登録
      expect(calendar.isCompanyHoliday(new Date(2026, 11, 28))).toBe(false);
    });
  });

  describe('addCompanyHoliday', () => {
    it('会社休日を追加できる', () => {
      const calendar = new CompanyCalendar(8);
      expect(calendar.getCompanyHolidays()).toHaveLength(0);

      calendar.addCompanyHoliday({
        date: new Date(2026, 11, 30),
        name: '年末休暇',
        type: 'COMPANY',
      });

      expect(calendar.getCompanyHolidays()).toHaveLength(1);
    });
  });

  describe('getCompanyHolidays', () => {
    it('内部配列のコピーを返す（破壊的変更の防止）', () => {
      const calendar = new CompanyCalendar(8, [
        { date: new Date(2026, 11, 29), name: '年末休暇', type: 'COMPANY' },
      ]);

      const holidays = calendar.getCompanyHolidays();
      holidays.push({ date: new Date(2026, 11, 30), name: '追加', type: 'COMPANY' });

      expect(calendar.getCompanyHolidays()).toHaveLength(1);
    });
  });

  describe('getStandardWorkingHours', () => {
    it('設定した基準時間を返す', () => {
      const calendar = new CompanyCalendar(7.5);
      expect(calendar.getStandardWorkingHours()).toBe(7.5);
    });
  });

  describe('countWorkingDays', () => {
    const calendar = new CompanyCalendar(7.5);

    it('平日のみの範囲（両端含む）の稼働日数を数える', () => {
      // 2026-07-06(月)〜2026-07-10(金) = 5営業日
      expect(
        calendar.countWorkingDays(new Date(2026, 6, 6), new Date(2026, 6, 10))
      ).toBe(5);
    });

    it('土日を除外して数える', () => {
      // 2026-07-06(月)〜2026-07-12(日) = 平日5日
      expect(
        calendar.countWorkingDays(new Date(2026, 6, 6), new Date(2026, 6, 12))
      ).toBe(5);
    });

    it('祝日を除外して数える', () => {
      // 2026-07-20 は海の日(月)。2026-07-20〜2026-07-24 = 火〜金の4営業日
      expect(
        calendar.countWorkingDays(new Date(2026, 6, 20), new Date(2026, 6, 24))
      ).toBe(4);
    });

    it('同一日（営業日）は1、休日は0', () => {
      expect(
        calendar.countWorkingDays(new Date(2026, 6, 8), new Date(2026, 6, 8))
      ).toBe(1);
      // 2026-07-11 は土曜日
      expect(
        calendar.countWorkingDays(new Date(2026, 6, 11), new Date(2026, 6, 11))
      ).toBe(0);
    });

    it('end < start の場合は0を返す', () => {
      expect(
        calendar.countWorkingDays(new Date(2026, 6, 10), new Date(2026, 6, 6))
      ).toBe(0);
    });
  });
});
