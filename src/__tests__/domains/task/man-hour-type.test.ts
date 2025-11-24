import { ManHourType } from "@/domains/task/value-object/man-hour-type";

describe('ManHourType', () => {
  describe('constructor', () => {
    it('NORMAL型で初期化できること', () => {
      const manHourType = new ManHourType({ type: 'NORMAL' });
      expect(manHourType.type).toBe('NORMAL');
    });

    it('RISK型で初期化できること', () => {
      const manHourType = new ManHourType({ type: 'RISK' });
      expect(manHourType.type).toBe('RISK');
    });

  });
});