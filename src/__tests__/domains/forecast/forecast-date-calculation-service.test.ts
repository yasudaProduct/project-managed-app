import { ForecastDateCalculationService } from '@/domains/forecast/forecast-date-calculation-service';
import { CompanyCalendar, CompanyHoliday } from '@/domains/calendar/company-calendar';

describe('ForecastDateCalculationService', () => {
  const calendar = new CompanyCalendar(7.5);

  describe('calculateForecastEndDate', () => {
    it('残工数が2営業日分の場合、基準日当日から消化し翌営業日が終了日になる', () => {
      // 2026-07-08 は水曜日（営業日）。残15h = 7.5h × 2営業日
      const end = ForecastDateCalculationService.calculateForecastEndDate(
        { forecastHours: 15, actualHours: 0, baseDate: new Date(2026, 6, 8) },
        calendar
      );
      expect(end).toEqual(new Date(2026, 6, 9));
    });

    it('残工数が1日分以下の場合、基準日当日が終了日になる', () => {
      const end = ForecastDateCalculationService.calculateForecastEndDate(
        { forecastHours: 4, actualHours: 0, baseDate: new Date(2026, 6, 8) },
        calendar
      );
      expect(end).toEqual(new Date(2026, 6, 8));
    });

    it('実績工数を差し引いた残工数で計算する', () => {
      // 残 = 20 - 5 = 15h = 2営業日
      const end = ForecastDateCalculationService.calculateForecastEndDate(
        { forecastHours: 20, actualHours: 5, baseDate: new Date(2026, 6, 8) },
        calendar
      );
      expect(end).toEqual(new Date(2026, 6, 9));
    });

    it('土日をスキップして消化する', () => {
      // 2026-07-10 は金曜日。残15h → 金曜 + 月曜(7/13)
      const end = ForecastDateCalculationService.calculateForecastEndDate(
        { forecastHours: 15, actualHours: 0, baseDate: new Date(2026, 6, 10) },
        calendar
      );
      expect(end).toEqual(new Date(2026, 6, 13));
    });

    it('日本の祝日をスキップして消化する', () => {
      // 2026-07-17 は金曜日。土日 + 2026-07-20 海の日(月曜)をスキップ → 火曜(7/21)
      const end = ForecastDateCalculationService.calculateForecastEndDate(
        { forecastHours: 15, actualHours: 0, baseDate: new Date(2026, 6, 17) },
        calendar
      );
      expect(end).toEqual(new Date(2026, 6, 21));
    });

    it('会社独自休日をスキップして消化する', () => {
      const holidays: CompanyHoliday[] = [
        { date: new Date(2026, 6, 9), name: '創立記念日', type: 'COMPANY' },
      ];
      const calendarWithHoliday = new CompanyCalendar(7.5, holidays);
      // 木曜(7/9)が会社休日 → 水曜(7/8) + 金曜(7/10)
      const end = ForecastDateCalculationService.calculateForecastEndDate(
        { forecastHours: 15, actualHours: 0, baseDate: new Date(2026, 6, 8) },
        calendarWithHoliday
      );
      expect(end).toEqual(new Date(2026, 6, 10));
    });

    it('基準日自体が休日の場合、翌営業日から消化する', () => {
      // 2026-07-11 は土曜日。残7.5h → 月曜(7/13)
      const end = ForecastDateCalculationService.calculateForecastEndDate(
        { forecastHours: 7.5, actualHours: 0, baseDate: new Date(2026, 6, 11) },
        calendar
      );
      expect(end).toEqual(new Date(2026, 6, 13));
    });

    it('基準日の時刻成分は無視される（日単位で計算）', () => {
      const end = ForecastDateCalculationService.calculateForecastEndDate(
        { forecastHours: 15, actualHours: 0, baseDate: new Date(2026, 6, 8, 14, 30, 45) },
        calendar
      );
      expect(end).toEqual(new Date(2026, 6, 9));
    });

    it('端数時間は切り上げて営業日を消化する', () => {
      // 残7.6h @7.5h/日 → 2営業日
      const end = ForecastDateCalculationService.calculateForecastEndDate(
        { forecastHours: 7.6, actualHours: 0, baseDate: new Date(2026, 6, 8) },
        calendar
      );
      expect(end).toEqual(new Date(2026, 6, 9));
    });

    it('見通し工数が実績工数以下の場合はnullを返す', () => {
      const equal = ForecastDateCalculationService.calculateForecastEndDate(
        { forecastHours: 10, actualHours: 10, baseDate: new Date(2026, 6, 8) },
        calendar
      );
      const less = ForecastDateCalculationService.calculateForecastEndDate(
        { forecastHours: 8, actualHours: 10, baseDate: new Date(2026, 6, 8) },
        calendar
      );
      expect(equal).toBeNull();
      expect(less).toBeNull();
    });

    it('見通し工数が0の場合はnullを返す', () => {
      const end = ForecastDateCalculationService.calculateForecastEndDate(
        { forecastHours: 0, actualHours: 0, baseDate: new Date(2026, 6, 8) },
        calendar
      );
      expect(end).toBeNull();
    });

    it('異常に大きい残工数でも無限ループせず上限日で打ち切る', () => {
      const end = ForecastDateCalculationService.calculateForecastEndDate(
        { forecastHours: 1_000_000, actualHours: 0, baseDate: new Date(2026, 6, 8) },
        calendar
      );
      expect(end).not.toBeNull();
      const capDate = new Date(2026, 6, 8);
      capDate.setDate(
        capDate.getDate() + ForecastDateCalculationService.MAX_LOOKAHEAD_DAYS
      );
      expect(end!.getTime()).toBeLessThanOrEqual(capDate.getTime());
    });
  });
});
