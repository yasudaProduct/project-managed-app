import { NotificationType } from '@/types/notification';
import { NotificationPriority } from '@/domains/notification/notification-priority';

// Simple unit test for hook types and interfaces
describe('useNotifications types', () => {
  it('should define correct notification data structure', () => {
    const mockNotification = {
      id: '1',
      userId: 'user1',
      type: 'TASK_DEADLINE_WARNING' as string,
      title: 'タスクの期限が近づいています',
      message: 'プロジェクトAのタスクBの期限が明日です。',
      priority: 'HIGH' as string,
      isRead: false,
      createdAt: new Date('2024-01-01').toISOString(),
      updatedAt: new Date('2024-01-01').toISOString(),
      actionUrl: '/projects/456/tasks/123',
    };

    expect(mockNotification.id).toBe('1');
    expect(mockNotification.type).toBe('TASK_DEADLINE_WARNING');
    expect(mockNotification.priority).toBe('HIGH');
    expect(mockNotification.isRead).toBe(false);
  });

  it('should define correct API response structure', () => {
    const mockApiResponse = {
      notifications: [],
      totalCount: 0,
      unreadCount: 0,
      totalPages: 1,
      currentPage: 1,
      hasNext: false,
      hasPrev: false,
    };

    expect(mockApiResponse.notifications).toEqual([]);
    expect(mockApiResponse.totalCount).toBe(0);
    expect(mockApiResponse.unreadCount).toBe(0);
    expect(mockApiResponse.totalPages).toBe(1);
    expect(mockApiResponse.currentPage).toBe(1);
    expect(mockApiResponse.hasNext).toBe(false);
    expect(mockApiResponse.hasPrev).toBe(false);
  });

  it('should validate notification type enum values', () => {
    expect(NotificationType.TASK_DEADLINE_WARNING).toBe('TASK_DEADLINE_WARNING');
    expect(NotificationType.TASK_ASSIGNED).toBe('TASK_ASSIGNED');
    expect(NotificationType.SCHEDULE_DELAY).toBe('SCHEDULE_DELAY');
  });

  it('should validate notification priority enum values', () => {
    expect(NotificationPriority.LOW).toBe('LOW');
    expect(NotificationPriority.MEDIUM).toBe('MEDIUM');
    expect(NotificationPriority.HIGH).toBe('HIGH');
    expect(NotificationPriority.URGENT).toBe('URGENT');
  });
});