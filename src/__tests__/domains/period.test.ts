import { Period } from "@/domains/task/period";
import { PeriodType } from "@/domains/task/period-type";
import { ManHour } from "@/domains/task/man-hour";
import { ManHourType } from "@/domains/task/man-hour-type";

describe('Period', () => {
  const startDate = new Date('2025-01-01');
  const endDate = new Date('2025-01-31');
  const periodType = new PeriodType({ type: 'KIJUN' });
  const manHourType = new ManHourType({ type: 'NORMAL' });
  const manHours = [
    ManHour.create({ kosu: 8, type: manHourType })
  ];
  
  describe('create', () => {
    it('開始日、終了日、種別、工数から期間を作成できること', () => {
      const period = Period.create({
        startDate,
        endDate,
        type: periodType,
        manHours
      });
      
      expect(period).toBeInstanceOf(Period);
      expect(period.id).toBeUndefined();
      expect(period.startDate).toBe(startDate);
      expect(period.endDate).toBe(endDate);
      expect(period.type).toBe(periodType);
      expect(period.manHours).toBe(manHours);
      expect(period.manHours.length).toBe(1);
    });
  });
  
  describe('createFromDb', () => {
    it('ID、開始日、終了日、種別、工数から期間を作成できること', () => {
      const period = Period.createFromDb({
        id: 1,
        startDate,
        endDate,
        type: periodType,
        manHours
      });
      
      expect(period).toBeInstanceOf(Period);
      expect(period.id).toBe(1);
      expect(period.startDate).toBe(startDate);
      expect(period.endDate).toBe(endDate);
      expect(period.type).toBe(periodType);
      expect(period.manHours).toBe(manHours);
    });
  });
  
  describe('isEqual', () => {
    it('同じIDの期間は等しいと判定されること', () => {
      const period1 = Period.createFromDb({
        id: 1,
        startDate,
        endDate,
        type: periodType,
        manHours
      });
      
      const period2 = Period.createFromDb({
        id: 1,
        startDate: new Date('2025-02-01'),
        endDate: new Date('2025-02-28'),
        type: new PeriodType({ type: 'KIJUN' }),
        manHours: [ManHour.create({ kosu: 16, type: new ManHourType({ type: 'NORMAL' }) })]
      });
      
      expect(period1.isEqual(period2)).toBe(true);
    });
    
    it('異なるIDの期間は等しくないと判定されること', () => {
      const period1 = Period.createFromDb({
        id: 1,
        startDate,
        endDate,
        type: periodType,
        manHours
      });
      
      const period2 = Period.createFromDb({
        id: 2,
        startDate,
        endDate,
        type: periodType,
        manHours
      });
      
      expect(period1.isEqual(period2)).toBe(false);
    });
  });
});