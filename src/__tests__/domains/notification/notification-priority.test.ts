import { NotificationPriority, NotificationPriorityVO } from '@/domains/notification/notification-priority';

describe('NotificationPriorityVO', () => {
  describe('create / getValue', () => {
    it('各優先度のVOを作成できる', () => {
      expect(NotificationPriorityVO.create(NotificationPriority.LOW).getValue()).toBe(NotificationPriority.LOW);
      expect(NotificationPriorityVO.create(NotificationPriority.MEDIUM).getValue()).toBe(NotificationPriority.MEDIUM);
      expect(NotificationPriorityVO.create(NotificationPriority.HIGH).getValue()).toBe(NotificationPriority.HIGH);
      expect(NotificationPriorityVO.create(NotificationPriority.URGENT).getValue()).toBe(NotificationPriority.URGENT);
    });
  });

  describe('fromString', () => {
    it('文字列からVOを作成できる', () => {
      const vo = NotificationPriorityVO.fromString('HIGH');
      expect(vo.getValue()).toBe(NotificationPriority.HIGH);
    });

    it('無効な文字列の場合エラーを投げる', () => {
      expect(() => NotificationPriorityVO.fromString('INVALID'))
        .toThrow('Invalid notification priority: INVALID');
    });
  });

  describe('getDisplayName', () => {
    it.each([
      [NotificationPriority.LOW, '低'],
      [NotificationPriority.MEDIUM, '中'],
      [NotificationPriority.HIGH, '高'],
      [NotificationPriority.URGENT, '緊急'],
    ])('%s の表示名は "%s"', (priority, expected) => {
      expect(NotificationPriorityVO.create(priority).getDisplayName()).toBe(expected);
    });
  });

  describe('getNumericValue', () => {
    it.each([
      [NotificationPriority.LOW, 1],
      [NotificationPriority.MEDIUM, 2],
      [NotificationPriority.HIGH, 3],
      [NotificationPriority.URGENT, 4],
    ])('%s の数値は %d', (priority, expected) => {
      expect(NotificationPriorityVO.create(priority).getNumericValue()).toBe(expected);
    });
  });

  describe('getColor', () => {
    it.each([
      [NotificationPriority.LOW, 'gray'],
      [NotificationPriority.MEDIUM, 'blue'],
      [NotificationPriority.HIGH, 'orange'],
      [NotificationPriority.URGENT, 'red'],
    ])('%s の色は "%s"', (priority, expected) => {
      expect(NotificationPriorityVO.create(priority).getColor()).toBe(expected);
    });
  });

  describe('comparePriority', () => {
    it('高い優先度が先になる（降順）', () => {
      const urgent = NotificationPriorityVO.create(NotificationPriority.URGENT);
      const low = NotificationPriorityVO.create(NotificationPriority.LOW);

      expect(NotificationPriorityVO.comparePriority(urgent, low)).toBeLessThan(0);
      expect(NotificationPriorityVO.comparePriority(low, urgent)).toBeGreaterThan(0);
    });

    it('同じ優先度の場合0を返す', () => {
      const a = NotificationPriorityVO.create(NotificationPriority.MEDIUM);
      const b = NotificationPriorityVO.create(NotificationPriority.MEDIUM);

      expect(NotificationPriorityVO.comparePriority(a, b)).toBe(0);
    });
  });

  describe('equals', () => {
    it('同じ優先度の場合trueを返す', () => {
      const a = NotificationPriorityVO.create(NotificationPriority.HIGH);
      const b = NotificationPriorityVO.create(NotificationPriority.HIGH);
      expect(a.equals(b)).toBe(true);
    });

    it('異なる優先度の場合falseを返す', () => {
      const a = NotificationPriorityVO.create(NotificationPriority.HIGH);
      const b = NotificationPriorityVO.create(NotificationPriority.LOW);
      expect(a.equals(b)).toBe(false);
    });
  });

  describe('isHigherThan / isLowerThan', () => {
    it('URGENTはHIGHより高い', () => {
      const urgent = NotificationPriorityVO.create(NotificationPriority.URGENT);
      const high = NotificationPriorityVO.create(NotificationPriority.HIGH);

      expect(urgent.isHigherThan(high)).toBe(true);
      expect(urgent.isLowerThan(high)).toBe(false);
    });

    it('LOWはMEDIUMより低い', () => {
      const low = NotificationPriorityVO.create(NotificationPriority.LOW);
      const medium = NotificationPriorityVO.create(NotificationPriority.MEDIUM);

      expect(low.isLowerThan(medium)).toBe(true);
      expect(low.isHigherThan(medium)).toBe(false);
    });

    it('同じ優先度は高くも低くもない', () => {
      const a = NotificationPriorityVO.create(NotificationPriority.MEDIUM);
      const b = NotificationPriorityVO.create(NotificationPriority.MEDIUM);

      expect(a.isHigherThan(b)).toBe(false);
      expect(a.isLowerThan(b)).toBe(false);
    });
  });
});
