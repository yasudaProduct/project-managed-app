import { NotificationType, NotificationTypeVO } from '@/domains/notification/notification-type';

describe('NotificationTypeVO', () => {
  it('should have correct display names', () => {
    const taskDeadline = NotificationTypeVO.create(NotificationType.TASK_DEADLINE_WARNING);
    const taskManhour = NotificationTypeVO.create(NotificationType.TASK_MANHOUR_EXCEEDED);
    const scheduleDelay = NotificationTypeVO.create(NotificationType.SCHEDULE_DELAY);
    const taskAssigned = NotificationTypeVO.create(NotificationType.TASK_ASSIGNED);
    const taskUpdated = NotificationTypeVO.create(NotificationType.TASK_UPDATED);
    const projectStatus = NotificationTypeVO.create(NotificationType.PROJECT_STATUS_CHANGED);

    expect(taskDeadline.getDisplayName()).toBe('タスク期限警告');
    expect(taskManhour.getDisplayName()).toBe('工数超過');
    expect(scheduleDelay.getDisplayName()).toBe('スケジュール遅延');
    expect(taskAssigned.getDisplayName()).toBe('タスク割り当て');
    expect(taskUpdated.getDisplayName()).toBe('タスク更新');
    expect(projectStatus.getDisplayName()).toBe('プロジェクトステータス変更');
  });

  it('should have correct icons', () => {
    const taskDeadline = NotificationTypeVO.create(NotificationType.TASK_DEADLINE_WARNING);
    const taskManhour = NotificationTypeVO.create(NotificationType.TASK_MANHOUR_EXCEEDED);
    const scheduleDelay = NotificationTypeVO.create(NotificationType.SCHEDULE_DELAY);
    const taskAssigned = NotificationTypeVO.create(NotificationType.TASK_ASSIGNED);
    const projectStatus = NotificationTypeVO.create(NotificationType.PROJECT_STATUS_CHANGED);

    expect(taskDeadline.getIcon()).toBe('⏰');
    expect(taskManhour.getIcon()).toBe('📊');
    expect(scheduleDelay.getIcon()).toBe('⚠️');
    expect(taskAssigned.getIcon()).toBe('📋');
    expect(projectStatus.getIcon()).toBe('🚀');
  });

  it('should have correct values', () => {
    const taskDeadline = NotificationTypeVO.create(NotificationType.TASK_DEADLINE_WARNING);
    const taskManhour = NotificationTypeVO.create(NotificationType.TASK_MANHOUR_EXCEEDED);
    const scheduleDelay = NotificationTypeVO.create(NotificationType.SCHEDULE_DELAY);
    const taskAssigned = NotificationTypeVO.create(NotificationType.TASK_ASSIGNED);

    expect(taskDeadline.getValue()).toBe(NotificationType.TASK_DEADLINE_WARNING);
    expect(taskManhour.getValue()).toBe(NotificationType.TASK_MANHOUR_EXCEEDED);
    expect(scheduleDelay.getValue()).toBe(NotificationType.SCHEDULE_DELAY);
    expect(taskAssigned.getValue()).toBe(NotificationType.TASK_ASSIGNED);
  });

  it('should create from enum value', () => {
    const type = NotificationTypeVO.create(NotificationType.TASK_ASSIGNED);
    expect(type.getValue()).toBe(NotificationType.TASK_ASSIGNED);
  });

  it('should create from string', () => {
    const type = NotificationTypeVO.fromString('TASK_ASSIGNED');
    expect(type.getValue()).toBe(NotificationType.TASK_ASSIGNED);
  });

  it('should throw error for invalid string', () => {
    expect(() => NotificationTypeVO.fromString('INVALID_TYPE')).toThrow('Invalid notification type: INVALID_TYPE');
  });

  it('should be equal when values match', () => {
    const type1 = NotificationTypeVO.create(NotificationType.TASK_ASSIGNED);
    const type2 = NotificationTypeVO.fromString('TASK_ASSIGNED');
    expect(type1.equals(type2)).toBe(true);
  });

  it('should not be equal when values differ', () => {
    const type1 = NotificationTypeVO.create(NotificationType.TASK_ASSIGNED);
    const type2 = NotificationTypeVO.create(NotificationType.SCHEDULE_DELAY);
    expect(type1.equals(type2)).toBe(false);
  });
});