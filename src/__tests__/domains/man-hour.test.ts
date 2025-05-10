import { ManHour } from "@/domains/task/man-hour";
import { ManHourType } from "@/domains/task/value-object/man-hour-type";

describe('ManHour', () => {
  const manHourType = new ManHourType({ type: 'NORMAL' });

  describe('create', () => {
    it('工数と種別から工数オブジェクトを作成できること', () => {
      const manHour = ManHour.create({
        kosu: 8,
        type: manHourType
      });

      expect(manHour).toBeInstanceOf(ManHour);
      expect(manHour.id).toBeUndefined();
      expect(manHour.kosu).toBe(8);
      expect(manHour.type).toBe(manHourType);
    });
  });

  describe('createFromDb', () => {
    it('ID、工数、種別から工数オブジェクトを作成できること', () => {
      const manHour = ManHour.createFromDb({
        id: 1,
        kosu: 8,
        type: manHourType
      });

      expect(manHour).toBeInstanceOf(ManHour);
      expect(manHour.id).toBe(1);
      expect(manHour.kosu).toBe(8);
      expect(manHour.type).toBe(manHourType);
    });
  });

  describe('isEqual', () => {
    it('同じIDの工数は等しいと判定されること', () => {
      const manHour1 = ManHour.createFromDb({
        id: 1,
        kosu: 8,
        type: new ManHourType({ type: 'NORMAL' })
      });

      const manHour2 = ManHour.createFromDb({
        id: 1,
        kosu: 16,
        type: new ManHourType({ type: 'RISK' })
      });

      expect(manHour1.isEqual(manHour2)).toBe(true);
    });

    it('異なるIDの工数は等しくないと判定されること', () => {
      const manHour1 = ManHour.createFromDb({
        id: 1,
        kosu: 8,
        type: manHourType
      });

      const manHour2 = ManHour.createFromDb({
        id: 2,
        kosu: 8,
        type: manHourType
      });

      expect(manHour1.isEqual(manHour2)).toBe(false);
    });
  });
});