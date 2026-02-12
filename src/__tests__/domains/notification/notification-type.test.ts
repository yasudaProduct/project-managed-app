import { NotificationTypeVO } from '@/domains/notification/notification-type';
import { NotificationType } from '@/types/notification';

describe('NotificationTypeVO', () => {
  describe('create / getValue', () => {
    it('各タイプのVOを作成できる', () => {
      const vo = NotificationTypeVO.create(NotificationType.TASK_DEADLINE_WARNING);
      expect(vo.getValue()).toBe(NotificationType.TASK_DEADLINE_WARNING);
    });
  });

  describe('fromString', () => {
    it('文字列からVOを作成できる', () => {
      const vo = NotificationTypeVO.fromString('TASK_DEADLINE_WARNING');
      expect(vo.getValue()).toBe(NotificationType.TASK_DEADLINE_WARNING);
    });

    it('無効な文字列の場合エラーを投げる', () => {
      expect(() => NotificationTypeVO.fromString('INVALID'))
        .toThrow('Invalid notification type: INVALID');
    });
  });

  describe('equals', () => {
    it('同じタイプの場合trueを返す', () => {
      const a = NotificationTypeVO.create(NotificationType.TASK_ASSIGNED);
      const b = NotificationTypeVO.create(NotificationType.TASK_ASSIGNED);
      expect(a.equals(b)).toBe(true);
    });

    it('異なるタイプの場合falseを返す', () => {
      const a = NotificationTypeVO.create(NotificationType.TASK_ASSIGNED);
      const b = NotificationTypeVO.create(NotificationType.SCHEDULE_DELAY);
      expect(a.equals(b)).toBe(false);
    });
  });
});
