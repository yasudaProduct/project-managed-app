import { injectable } from 'inversify';
import { PrismaClient } from '@prisma/client';
import { Notification } from '@/domains/notification/notification';
import { NotificationPreference } from '@/domains/notification/notification-preference';
import { 
  INotificationRepository,
  NotificationFilter,
  NotificationListOptions,
  NotificationListResult,
  PushSubscriptionData
} from '@/applications/notification/INotificationRepository';

@injectable()
export class NotificationRepository implements INotificationRepository {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = new PrismaClient();
  }

  async findById(id: number): Promise<Notification | null> {
    const record = await this.prisma.notification.findUnique({
      where: { id },
    });

    if (!record) {
      return null;
    }

    return this.toDomainModel(record);
  }

  async findByUserId(userId: string, options?: NotificationListOptions): Promise<NotificationListResult> {
    const filter: NotificationFilter = { userId };
    return this.findByFilter(filter, options);
  }

  async findByFilter(
    filter: NotificationFilter,
    options: NotificationListOptions = { page: 1, limit: 20 }
  ): Promise<NotificationListResult> {
    const where: any = {
      userId: filter.userId,
    };

    if (filter.type) {
      where.type = filter.type;
    }

    if (filter.priority) {
      where.priority = filter.priority;
    }

    if (filter.isRead !== undefined) {
      where.isRead = filter.isRead;
    }

    if (filter.scheduledBefore) {
      where.scheduledAt = { lte: filter.scheduledBefore };
    }

    if (filter.scheduledAfter) {
      where.scheduledAt = { gte: filter.scheduledAfter };
    }

    if (filter.createdBefore || filter.createdAfter) {
      where.createdAt = {};
      if (filter.createdBefore) {
        where.createdAt.lte = filter.createdBefore;
      }
      if (filter.createdAfter) {
        where.createdAt.gte = filter.createdAfter;
      }
    }

    const skip = (options.page - 1) * options.limit;
    const orderBy: any = {};

    if (options.sortBy) {
      orderBy[options.sortBy] = options.sortOrder ?? 'desc';
    } else {
      orderBy.createdAt = 'desc';
    }

    const [records, total] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        skip,
        take: options.limit,
        orderBy,
      }),
      this.prisma.notification.count({ where }),
    ]);

    const data = records.map(record => this.toDomainModel(record));
    const totalPages = Math.ceil(total / options.limit);

    return {
      data,
      total,
      page: options.page,
      limit: options.limit,
      totalPages,
      hasNext: options.page < totalPages,
      hasPrev: options.page > 1,
    };
  }

  async create(notification: Notification): Promise<Notification> {
    const record = await this.prisma.notification.create({
      data: {
        userId: notification.userId,
        type: notification.type.getValue(),
        priority: notification.priority.getValue(),
        title: notification.title,
        message: notification.message,
        data: notification.data ? JSON.stringify(notification.data) : null,
        channels: notification.channels.map(c => c.getValue()),
        scheduledAt: notification.scheduledAt,
      },
    });

    return this.toDomainModel(record);
  }

  async createBatch(notifications: Notification[]): Promise<Notification[]> {
    const data = notifications.map(notification => ({
      userId: notification.userId,
      type: notification.type.getValue(),
      priority: notification.priority.getValue(),
      title: notification.title,
      message: notification.message,
      data: notification.data ? JSON.stringify(notification.data) : null,
      channels: notification.channels.map(c => c.getValue()),
      scheduledAt: notification.scheduledAt,
    }));

    // Prismaのcreate Manyを使用
    await this.prisma.notification.createMany({ data });

    // 作成された通知を取得（IDを含む）
    const lastCreated = await this.prisma.notification.findMany({
      where: {
        userId: { in: notifications.map(n => n.userId) },
      },
      orderBy: { createdAt: 'desc' },
      take: notifications.length,
    });

    return lastCreated.map(record => this.toDomainModel(record));
  }

  async update(notification: Notification): Promise<Notification> {
    if (!notification.id) {
      throw new Error('Cannot update notification without ID');
    }

    const record = await this.prisma.notification.update({
      where: { id: notification.id },
      data: {
        type: notification.type.getValue(),
        priority: notification.priority.getValue(),
        title: notification.title,
        message: notification.message,
        data: notification.data ? JSON.stringify(notification.data) : null,
        channels: notification.channels.map(c => c.getValue()),
        isRead: notification.isRead,
        readAt: notification.readAt,
        scheduledAt: notification.scheduledAt,
        sentAt: notification.sentAt,
      },
    });

    return this.toDomainModel(record);
  }

  async delete(id: number): Promise<void> {
    await this.prisma.notification.delete({
      where: { id },
    });
  }

  async markAsRead(userId: string, notificationIds: number[]): Promise<void> {
    await this.prisma.notification.updateMany({
      where: {
        id: { in: notificationIds },
        userId,
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });
  }

  async markAllAsRead(userId: string): Promise<void> {
    await this.prisma.notification.updateMany({
      where: {
        userId,
        isRead: false,
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });
  }

  async getUnreadCount(userId: string): Promise<number> {
    return this.prisma.notification.count({
      where: {
        userId,
        isRead: false,
      },
    });
  }

  async getCountByType(userId: string, type: string): Promise<number> {
    return this.prisma.notification.count({
      where: {
        userId,
        type: type as any,
      },
    });
  }

  async findScheduledNotifications(before: Date): Promise<Notification[]> {
    const records = await this.prisma.notification.findMany({
      where: {
        scheduledAt: {
          lte: before,
        },
        sentAt: null,
      },
      orderBy: { scheduledAt: 'asc' },
    });

    return records.map(record => this.toDomainModel(record));
  }

  async findOverdueNotifications(): Promise<Notification[]> {
    const records = await this.prisma.notification.findMany({
      where: {
        scheduledAt: {
          lt: new Date(),
        },
        sentAt: null,
      },
      orderBy: { scheduledAt: 'asc' },
    });

    return records.map(record => this.toDomainModel(record));
  }

  async markAsSent(notificationIds: number[], sentAt: Date): Promise<void> {
    await this.prisma.notification.updateMany({
      where: {
        id: { in: notificationIds },
      },
      data: {
        sentAt,
      },
    });
  }

  async findPreferenceByUserId(userId: string): Promise<NotificationPreference | null> {
    const record = await this.prisma.notificationPreference.findUnique({
      where: { userId },
    });

    if (!record) {
      return null;
    }

    return NotificationPreference.createFromDb({
      id: record.id,
      userId: record.userId,
      enablePush: record.enablePush,
      enableInApp: record.enableInApp,
      enableEmail: record.enableEmail,
      taskDeadline: record.taskDeadline as any,
      manhourThreshold: record.manhourThreshold as any,
      scheduleDelay: record.scheduleDelay,
      taskAssignment: record.taskAssignment,
      projectStatusChange: record.projectStatusChange,
      quietHoursStart: record.quietHoursStart,
      quietHoursEnd: record.quietHoursEnd,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });
  }

  async savePreference(preference: NotificationPreference): Promise<NotificationPreference> {
    const record = await this.prisma.notificationPreference.create({
      data: {
        userId: preference.userId,
        enablePush: preference.enablePush,
        enableInApp: preference.enableInApp,
        enableEmail: preference.enableEmail,
        taskDeadline: preference.taskDeadline,
        manhourThreshold: preference.manhourThreshold,
        scheduleDelay: preference.scheduleDelay,
        taskAssignment: preference.taskAssignment,
        projectStatusChange: preference.projectStatusChange,
        quietHoursStart: preference.quietHoursStart,
        quietHoursEnd: preference.quietHoursEnd,
      },
    });

    return NotificationPreference.createFromDb({
      id: record.id,
      userId: record.userId,
      enablePush: record.enablePush,
      enableInApp: record.enableInApp,
      enableEmail: record.enableEmail,
      taskDeadline: record.taskDeadline as any,
      manhourThreshold: record.manhourThreshold as any,
      scheduleDelay: record.scheduleDelay,
      taskAssignment: record.taskAssignment,
      projectStatusChange: record.projectStatusChange,
      quietHoursStart: record.quietHoursStart,
      quietHoursEnd: record.quietHoursEnd,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });
  }

  async updatePreference(preference: NotificationPreference): Promise<NotificationPreference> {
    if (!preference.id) {
      throw new Error('Cannot update preference without ID');
    }

    const record = await this.prisma.notificationPreference.update({
      where: { id: preference.id },
      data: {
        enablePush: preference.enablePush,
        enableInApp: preference.enableInApp,
        enableEmail: preference.enableEmail,
        taskDeadline: preference.taskDeadline,
        manhourThreshold: preference.manhourThreshold,
        scheduleDelay: preference.scheduleDelay,
        taskAssignment: preference.taskAssignment,
        projectStatusChange: preference.projectStatusChange,
        quietHoursStart: preference.quietHoursStart,
        quietHoursEnd: preference.quietHoursEnd,
      },
    });

    return NotificationPreference.createFromDb({
      id: record.id,
      userId: record.userId,
      enablePush: record.enablePush,
      enableInApp: record.enableInApp,
      enableEmail: record.enableEmail,
      taskDeadline: record.taskDeadline as any,
      manhourThreshold: record.manhourThreshold as any,
      scheduleDelay: record.scheduleDelay,
      taskAssignment: record.taskAssignment,
      projectStatusChange: record.projectStatusChange,
      quietHoursStart: record.quietHoursStart,
      quietHoursEnd: record.quietHoursEnd,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });
  }

  async savePushSubscription(userId: string, subscription: PushSubscriptionData): Promise<void> {
    await this.prisma.pushSubscription.upsert({
      where: {
        userId_endpoint: {
          userId,
          endpoint: subscription.endpoint,
        },
      },
      create: {
        userId,
        endpoint: subscription.endpoint,
        keys: subscription.keys,
        userAgent: subscription.userAgent,
      },
      update: {
        keys: subscription.keys,
        userAgent: subscription.userAgent,
        isActive: true,
      },
    });
  }

  async findPushSubscriptionsByUserId(userId: string): Promise<PushSubscriptionData[]> {
    const records = await this.prisma.pushSubscription.findMany({
      where: {
        userId,
        isActive: true,
      },
    });

    return records.map(record => ({
      endpoint: record.endpoint,
      keys: record.keys as any,
      userAgent: record.userAgent || undefined,
    }));
  }

  async removePushSubscription(userId: string, endpoint?: string): Promise<void> {
    const where: any = { userId };
    
    if (endpoint) {
      where.endpoint = endpoint;
    }

    await this.prisma.pushSubscription.updateMany({
      where,
      data: {
        isActive: false,
      },
    });
  }

  async findActivePushSubscriptions(): Promise<Array<{ userId: string; subscription: PushSubscriptionData }>> {
    const records = await this.prisma.pushSubscription.findMany({
      where: {
        isActive: true,
      },
    });

    return records.map(record => ({
      userId: record.userId,
      subscription: {
        endpoint: record.endpoint,
        keys: record.keys as any,
        userAgent: record.userAgent || undefined,
      },
    }));
  }

  async deleteOldNotifications(beforeDate: Date): Promise<number> {
    const result = await this.prisma.notification.deleteMany({
      where: {
        createdAt: {
          lt: beforeDate,
        },
        isRead: true,
      },
    });

    return result.count;
  }

  async deleteReadNotifications(userId: string, beforeDate: Date): Promise<number> {
    const result = await this.prisma.notification.deleteMany({
      where: {
        userId,
        isRead: true,
        createdAt: {
          lt: beforeDate,
        },
      },
    });

    return result.count;
  }

  private toDomainModel(record: any): Notification {
    const data = record.data ? JSON.parse(record.data) : undefined;

    return Notification.createFromDb({
      id: record.id,
      userId: record.userId,
      type: record.type,
      priority: record.priority,
      title: record.title,
      message: record.message,
      data,
      channels: record.channels,
      isRead: record.isRead,
      readAt: record.readAt,
      scheduledAt: record.scheduledAt,
      sentAt: record.sentAt,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });
  }
}