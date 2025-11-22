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

    it('工数が0未満の場合はエラーが発生する', () => {
      expect(() => {
        ManHour.create({
          kosu: -1,
          type: manHourType
        });
      }).toThrow('工数は0以上である必要があります');
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
});