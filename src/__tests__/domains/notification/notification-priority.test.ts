import { NotificationPriorityVO, NotificationPriority } from '@/domains/notification/notification-priority';

describe('NotificationPriorityVO', () => {
  describe('create / fromString', () => {
    it('enum値からインスタンスを作成できる', () => {
      const priority = NotificationPriorityVO.create(NotificationPriority.HIGH);
      expect(priority.getValue()).toBe(NotificationPriority.HIGH);
    });

    it('有効な文字列からインスタンスを作成できる', () => {
      const priority = NotificationPriorityVO.fromString('URGENT');
      expect(priority.getValue()).toBe(NotificationPriority.URGENT);
    });

    it('無効な文字列で例外が発生する', () => {
      expect(() => NotificationPriorityVO.fromString('INVALID')).toThrow(
        'Invalid notification priority: INVALID'
      );
    });
  });

  describe('getNumericValue', () => {
    it('LOW は 1', () => {
      expect(NotificationPriorityVO.create(NotificationPriority.LOW).getNumericValue()).toBe(1);
    });

    it('MEDIUM は 2', () => {
      expect(NotificationPriorityVO.create(NotificationPriority.MEDIUM).getNumericValue()).toBe(2);
    });

    it('HIGH は 3', () => {
      expect(NotificationPriorityVO.create(NotificationPriority.HIGH).getNumericValue()).toBe(3);
    });

    it('URGENT は 4', () => {
      expect(NotificationPriorityVO.create(NotificationPriority.URGENT).getNumericValue()).toBe(4);
    });
  });

  describe('comparePriority', () => {
    it('URGENT が LOW より先にソートされる（負の値）', () => {
      const urgent = NotificationPriorityVO.create(NotificationPriority.URGENT);
      const low = NotificationPriorityVO.create(NotificationPriority.LOW);
      expect(NotificationPriorityVO.comparePriority(urgent, low)).toBeLessThan(0);
    });

    it('LOW が URGENT より後にソートされる（正の値）', () => {
      const urgent = NotificationPriorityVO.create(NotificationPriority.URGENT);
      const low = NotificationPriorityVO.create(NotificationPriority.LOW);
      expect(NotificationPriorityVO.comparePriority(low, urgent)).toBeGreaterThan(0);
    });

    it('同じ優先度はゼロを返す', () => {
      const a = NotificationPriorityVO.create(NotificationPriority.MEDIUM);
      const b = NotificationPriorityVO.create(NotificationPriority.MEDIUM);
      expect(NotificationPriorityVO.comparePriority(a, b)).toBe(0);
    });
  });

  describe('isHigherThan / isLowerThan', () => {
    it('URGENT は HIGH より高い', () => {
      const urgent = NotificationPriorityVO.create(NotificationPriority.URGENT);
      const high = NotificationPriorityVO.create(NotificationPriority.HIGH);
      expect(urgent.isHigherThan(high)).toBe(true);
      expect(urgent.isLowerThan(high)).toBe(false);
    });

    it('LOW は MEDIUM より低い', () => {
      const low = NotificationPriorityVO.create(NotificationPriority.LOW);
      const medium = NotificationPriorityVO.create(NotificationPriority.MEDIUM);
      expect(low.isLowerThan(medium)).toBe(true);
      expect(low.isHigherThan(medium)).toBe(false);
    });

    it('同じ優先度は高くも低くもない', () => {
      const a = NotificationPriorityVO.create(NotificationPriority.HIGH);
      const b = NotificationPriorityVO.create(NotificationPriority.HIGH);
      expect(a.isHigherThan(b)).toBe(false);
      expect(a.isLowerThan(b)).toBe(false);
    });
  });

  describe('equals', () => {
    it('同じ優先度は等しい', () => {
      const a = NotificationPriorityVO.create(NotificationPriority.HIGH);
      const b = NotificationPriorityVO.create(NotificationPriority.HIGH);
      expect(a.equals(b)).toBe(true);
    });

    it('異なる優先度は等しくない', () => {
      const a = NotificationPriorityVO.create(NotificationPriority.HIGH);
      const b = NotificationPriorityVO.create(NotificationPriority.LOW);
      expect(a.equals(b)).toBe(false);
    });
  });

  describe('getDisplayName', () => {
    it.each([
      [NotificationPriority.LOW, '低'],
      [NotificationPriority.MEDIUM, '中'],
      [NotificationPriority.HIGH, '高'],
      [NotificationPriority.URGENT, '緊急'],
    ])('%s の表示名は「%s」', (priority, expected) => {
      expect(NotificationPriorityVO.create(priority).getDisplayName()).toBe(expected);
    });
  });

  describe('getColor', () => {
    it.each([
      [NotificationPriority.LOW, 'gray'],
      [NotificationPriority.MEDIUM, 'blue'],
      [NotificationPriority.HIGH, 'orange'],
      [NotificationPriority.URGENT, 'red'],
    ])('%s の色は %s', (priority, expected) => {
      expect(NotificationPriorityVO.create(priority).getColor()).toBe(expected);
    });
  });
});
