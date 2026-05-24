import { NotificationTypeVO } from '@/domains/notification/notification-type';
import { NotificationType } from '@/types/notification';

describe('NotificationTypeVO', () => {
  describe('create', () => {
    it('enum値からインスタンスを作成できる', () => {
      const type = NotificationTypeVO.create(NotificationType.TASK_DEADLINE_WARNING);
      expect(type.getValue()).toBe(NotificationType.TASK_DEADLINE_WARNING);
    });
  });

  describe('fromString', () => {
    it('有効な文字列からインスタンスを作成できる', () => {
      const type = NotificationTypeVO.fromString('TASK_ASSIGNED');
      expect(type.getValue()).toBe(NotificationType.TASK_ASSIGNED);
    });

    it('無効な文字列で例外が発生する', () => {
      expect(() => NotificationTypeVO.fromString('INVALID')).toThrow(
        'Invalid notification type: INVALID'
      );
    });
  });

  describe('equals', () => {
    it('同じタイプは等しい', () => {
      const a = NotificationTypeVO.create(NotificationType.TASK_ASSIGNED);
      const b = NotificationTypeVO.create(NotificationType.TASK_ASSIGNED);
      expect(a.equals(b)).toBe(true);
    });

    it('異なるタイプは等しくない', () => {
      const a = NotificationTypeVO.create(NotificationType.TASK_ASSIGNED);
      const b = NotificationTypeVO.create(NotificationType.SCHEDULE_DELAY);
      expect(a.equals(b)).toBe(false);
    });
  });
});
