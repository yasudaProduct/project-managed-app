import { Period } from "@/domains/task/period";
import { PeriodType } from "@/domains/task/value-object/period-type";
import { ManHour } from "@/domains/task/man-hour";
import { ManHourType } from "@/domains/task/value-object/man-hour-type";

describe('Period', () => {
  const startDate = new Date('2025-01-01');
  const endDate = new Date('2025-01-31');
  const periodType = new PeriodType({ type: 'KIJUN' });
  const manHourType = new ManHourType({ type: 'NORMAL' });
  const manHours = [
    ManHour.create({ kosu: 8, type: manHourType })
  ];

  describe('create', () => {
    it('期間を作成できること', () => {
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

    it('期間が不正な場合はエラーが発生する', () => {
      expect(() => {
        Period.create({
          startDate: new Date('2025-01-02'),
          endDate: new Date('2025-01-01'),
          type: periodType,
          manHours
        });
      }).toThrow('期間が不正です');
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

});