import { NotificationRepository } from "@/infrastructures/notification/NotificationRepository";

// NotificationRepositoryはnew PrismaClient()を内部で生成するためモック方法が異なる
const mockNotification = {
  findUnique: jest.fn(),
  findMany: jest.fn(),
  count: jest.fn(),
  create: jest.fn(),
  createMany: jest.fn(),
  update: jest.fn(),
  updateMany: jest.fn(),
  delete: jest.fn(),
  deleteMany: jest.fn(),
};

const mockNotificationPreference = {
  findUnique: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
};

const mockPushSubscription = {
  upsert: jest.fn(),
  findMany: jest.fn(),
  updateMany: jest.fn(),
};

jest.mock('@prisma/client', () => {
  return {
    PrismaClient: jest.fn().mockImplementation(() => ({
      notification: mockNotification,
      notificationPreference: mockNotificationPreference,
      pushSubscription: mockPushSubscription,
    })),
    Prisma: {
      NotificationOrderByWithRelationInput: {},
    },
    NotificationType: {
      TASK_DEADLINE: 'TASK_DEADLINE',
      SCHEDULE_DELAY: 'SCHEDULE_DELAY',
    },
    NotificationPriority: {
      LOW: 'LOW',
      MEDIUM: 'MEDIUM',
      HIGH: 'HIGH',
    },
  };
});

describe('NotificationRepository', () => {
  let repository: NotificationRepository;

  const now = new Date();
  const mockNotificationRecord = {
    id: 1,
    userId: 'user-1',
    type: 'TASK_DEADLINE_WARNING',
    priority: 'HIGH',
    title: 'テスト通知',
    message: 'テストメッセージ',
    data: null,
    channels: ['IN_APP'],
    isRead: false,
    readAt: null,
    scheduledAt: null,
    sentAt: null,
    createdAt: now,
    updatedAt: now,
  };

  beforeEach(() => {
    repository = new NotificationRepository();
    jest.clearAllMocks();
    jest.spyOn(console, 'log').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('findById', () => {
    it('IDで通知を取得できること', async () => {
      mockNotification.findUnique.mockResolvedValue(mockNotificationRecord);

      const notification = await repository.findById(1);

      expect(mockNotification.findUnique).toHaveBeenCalledWith({ where: { id: 1 } });
      expect(notification).not.toBeNull();
      expect(notification?.id).toBe(1);
      expect(notification?.title).toBe('テスト通知');
    });

    it('存在しないIDの場合はnullを返すこと', async () => {
      mockNotification.findUnique.mockResolvedValue(null);

      const notification = await repository.findById(999);

      expect(notification).toBeNull();
    });
  });

  describe('findByUserId', () => {
    it('ユーザーIDで通知一覧を取得できること', async () => {
      mockNotification.findMany.mockResolvedValue([mockNotificationRecord]);
      mockNotification.count.mockResolvedValue(1);

      const result = await repository.findByUserId('user-1');

      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
    });
  });

  describe('findByFilter', () => {
    it('フィルター条件で通知を取得できること', async () => {
      mockNotification.findMany.mockResolvedValue([mockNotificationRecord]);
      mockNotification.count.mockResolvedValue(1);

      const result = await repository.findByFilter(
        { userId: 'user-1', isRead: false },
        { page: 1, limit: 10 }
      );

      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
    });

    it('ページネーションが正しく計算されること', async () => {
      mockNotification.findMany.mockResolvedValue([]);
      mockNotification.count.mockResolvedValue(25);

      const result = await repository.findByFilter(
        { userId: 'user-1' },
        { page: 2, limit: 10 }
      );

      expect(result.totalPages).toBe(3);
      expect(result.hasNext).toBe(true);
      expect(result.hasPrev).toBe(true);
    });
  });

  describe('delete', () => {
    it('通知を削除できること', async () => {
      mockNotification.delete.mockResolvedValue({});

      await repository.delete(1);

      expect(mockNotification.delete).toHaveBeenCalledWith({ where: { id: 1 } });
    });
  });

  describe('markAsRead', () => {
    it('通知を既読にできること', async () => {
      mockNotification.updateMany.mockResolvedValue({ count: 2 });

      await repository.markAsRead('user-1', [1, 2]);

      expect(mockNotification.updateMany).toHaveBeenCalledWith({
        where: {
          id: { in: [1, 2] },
          userId: 'user-1',
        },
        data: {
          isRead: true,
          readAt: expect.any(Date),
        },
      });
    });
  });

  describe('markAllAsRead', () => {
    it('すべての通知を既読にできること', async () => {
      mockNotification.updateMany.mockResolvedValue({ count: 5 });

      await repository.markAllAsRead('user-1');

      expect(mockNotification.updateMany).toHaveBeenCalledWith({
        where: {
          userId: 'user-1',
          isRead: false,
        },
        data: {
          isRead: true,
          readAt: expect.any(Date),
        },
      });
    });
  });

  describe('getUnreadCount', () => {
    it('未読通知数を取得できること', async () => {
      mockNotification.count.mockResolvedValue(3);

      const count = await repository.getUnreadCount('user-1');

      expect(mockNotification.count).toHaveBeenCalledWith({
        where: { userId: 'user-1', isRead: false },
      });
      expect(count).toBe(3);
    });
  });

  describe('getCountByType', () => {
    it('通知タイプごとの件数を取得できること', async () => {
      mockNotification.count.mockResolvedValue(2);

      const count = await repository.getCountByType('user-1', 'TASK_DEADLINE_WARNING');

      expect(mockNotification.count).toHaveBeenCalledWith({
        where: { userId: 'user-1', type: 'TASK_DEADLINE_WARNING' },
      });
      expect(count).toBe(2);
    });
  });

  describe('findScheduledNotifications', () => {
    it('スケジュール通知を取得できること', async () => {
      mockNotification.findMany.mockResolvedValue([
        { ...mockNotificationRecord, scheduledAt: now, sentAt: null },
      ]);

      const notifications = await repository.findScheduledNotifications(now);

      expect(mockNotification.findMany).toHaveBeenCalledWith({
        where: {
          scheduledAt: { lte: now },
          sentAt: null,
        },
        orderBy: { scheduledAt: 'asc' },
      });
      expect(notifications).toHaveLength(1);
    });
  });

  describe('markAsSent', () => {
    it('通知を送信済みにできること', async () => {
      mockNotification.updateMany.mockResolvedValue({ count: 2 });

      await repository.markAsSent([1, 2], now);

      expect(mockNotification.updateMany).toHaveBeenCalledWith({
        where: { id: { in: [1, 2] } },
        data: { sentAt: now },
      });
    });
  });

  describe('findPreferenceByUserId', () => {
    it('ユーザーの通知設定を取得できること', async () => {
      const mockPref = {
        id: 1,
        userId: 'user-1',
        enablePush: true,
        enableInApp: true,
        enableEmail: false,
        taskDeadline: { enabled: true },
        manhourThreshold: { enabled: false },
        scheduleDelay: true,
        taskAssignment: true,
        projectStatusChange: true,
        createdAt: now,
        updatedAt: now,
      };
      mockNotificationPreference.findUnique.mockResolvedValue(mockPref);

      const pref = await repository.findPreferenceByUserId('user-1');

      expect(pref).not.toBeNull();
      expect(pref?.userId).toBe('user-1');
      expect(pref?.enablePush).toBe(true);
    });

    it('設定が存在しない場合はnullを返すこと', async () => {
      mockNotificationPreference.findUnique.mockResolvedValue(null);

      const pref = await repository.findPreferenceByUserId('user-1');

      expect(pref).toBeNull();
    });
  });

  describe('savePushSubscription', () => {
    it('Push通知設定を保存できること', async () => {
      mockPushSubscription.upsert.mockResolvedValue({});

      await repository.savePushSubscription('user-1', {
        endpoint: 'https://push.example.com/endpoint',
        keys: { p256dh: 'key1', auth: 'key2' },
        userAgent: 'TestAgent',
      });

      expect(mockPushSubscription.upsert).toHaveBeenCalledWith({
        where: {
          userId_endpoint: {
            userId: 'user-1',
            endpoint: 'https://push.example.com/endpoint',
          },
        },
        create: {
          userId: 'user-1',
          endpoint: 'https://push.example.com/endpoint',
          keys: { p256dh: 'key1', auth: 'key2' },
          userAgent: 'TestAgent',
        },
        update: {
          keys: { p256dh: 'key1', auth: 'key2' },
          userAgent: 'TestAgent',
          isActive: true,
        },
      });
    });
  });

  describe('findPushSubscriptionsByUserId', () => {
    it('ユーザーのPush通知設定一覧を取得できること', async () => {
      mockPushSubscription.findMany.mockResolvedValue([
        {
          endpoint: 'https://push.example.com/endpoint',
          keys: { p256dh: 'key1', auth: 'key2' },
          userAgent: 'TestAgent',
        },
      ]);

      const subs = await repository.findPushSubscriptionsByUserId('user-1');

      expect(mockPushSubscription.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-1', isActive: true },
      });
      expect(subs).toHaveLength(1);
      expect(subs[0].endpoint).toBe('https://push.example.com/endpoint');
    });
  });

  describe('removePushSubscription', () => {
    it('特定エンドポイントのPush通知設定を無効化できること', async () => {
      mockPushSubscription.updateMany.mockResolvedValue({ count: 1 });

      await repository.removePushSubscription('user-1', 'https://push.example.com/endpoint');

      expect(mockPushSubscription.updateMany).toHaveBeenCalledWith({
        where: { userId: 'user-1', endpoint: 'https://push.example.com/endpoint' },
        data: { isActive: false },
      });
    });

    it('エンドポイント未指定の場合ユーザーの全設定を無効化すること', async () => {
      mockPushSubscription.updateMany.mockResolvedValue({ count: 2 });

      await repository.removePushSubscription('user-1');

      expect(mockPushSubscription.updateMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        data: { isActive: false },
      });
    });
  });

  describe('deleteOldNotifications', () => {
    it('古い通知を削除できること', async () => {
      mockNotification.deleteMany.mockResolvedValue({ count: 10 });

      const beforeDate = new Date('2025-01-01');
      const count = await repository.deleteOldNotifications(beforeDate);

      expect(mockNotification.deleteMany).toHaveBeenCalledWith({
        where: {
          createdAt: { lt: beforeDate },
          isRead: true,
        },
      });
      expect(count).toBe(10);
    });
  });

  describe('deleteReadNotifications', () => {
    it('ユーザーの既読通知を削除できること', async () => {
      mockNotification.deleteMany.mockResolvedValue({ count: 5 });

      const beforeDate = new Date('2025-01-01');
      const count = await repository.deleteReadNotifications('user-1', beforeDate);

      expect(mockNotification.deleteMany).toHaveBeenCalledWith({
        where: {
          userId: 'user-1',
          isRead: true,
          createdAt: { lt: beforeDate },
        },
      });
      expect(count).toBe(5);
    });
  });
});
