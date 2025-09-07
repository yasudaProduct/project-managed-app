import { injectable } from 'inversify';
import { NotificationPriority, NotificationType, Prisma, PrismaClient } from '@prisma/client';
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

  /**
   * 通知を取得
   * @param id 
   * @returns 
   */
  async findById(id: number): Promise<Notification | null> {
    const record = await this.prisma.notification.findUnique({
      where: { id },
    });

    if (!record) {
      return null;
    }

    return this.toDomainModel(record);
  }

  /**
   * ユーザーIDを指定して通知を取得
   * @param userId ユーザーID
   * @param options オプション
   * @returns 通知リスト
   */
  async findByUserId(userId: string, options?: NotificationListOptions): Promise<NotificationListResult> {
    const filter: NotificationFilter = { userId };
    return this.findByFilter(filter, options);
  }

  /**
   * フィルターを指定して通知を取得
   * @param filter フィルター
   * @param options オプション
   * @returns 通知リスト
   */
  async findByFilter(
    filter: NotificationFilter,
    options: NotificationListOptions = { page: 1, limit: 20 }
  ): Promise<NotificationListResult> {
    const where: Prisma.NotificationWhereInput = {
      userId: filter.userId,
    };

    if (filter.type) {
      where.type = filter.type as NotificationType;
    }

    if (filter.priority) {
      where.priority = filter.priority as NotificationPriority;
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
    const orderBy: Prisma.NotificationOrderByWithRelationInput = {};

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

  /**
   * 通知を作成
   * @param notification 通知
   * @returns 通知
   */
  async create(notification: Notification): Promise<Notification> {
    const record = await this.prisma.notification.create({
      data: {
        userId: notification.userId,
        type: notification.type.getValue(),
        priority: notification.priority.getValue(),
        title: notification.title,
        message: notification.message,
        data: notification.data ? JSON.stringify(notification.data) : undefined,
        channels: notification.channels.map(c => c.getValue()),
        scheduledAt: notification.scheduledAt,
      },
    });

    return this.toDomainModel(record);
  }

  /**
   * 通知を複数作成
   * @param notifications 通知リスト
   * @returns 通知リスト
   */
  async createBatch(notifications: Notification[]): Promise<Notification[]> {
    const data = notifications.map(notification => ({
      userId: notification.userId,
      type: notification.type.getValue(),
      priority: notification.priority.getValue(),
      title: notification.title,
      message: notification.message,
      data: notification.data ? JSON.stringify(notification.data) : undefined,
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

  /**
   * 通知を更新
   * @param notification 通知
   * @returns 通知
   */
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
        data: notification.data ? JSON.stringify(notification.data) : undefined,
        channels: notification.channels.map(c => c.getValue()),
        isRead: notification.isRead,
        readAt: notification.readAt,
        scheduledAt: notification.scheduledAt,
        sentAt: notification.sentAt,
      },
    });

    return this.toDomainModel(record);
  }

  /**
   * 通知を削除
   * @param id 通知ID
   * @returns 
   */
  async delete(id: number): Promise<void> {
    await this.prisma.notification.delete({
      where: { id },
    });
  }

  /**
   * 通知を既読にする
   * @param userId ユーザーID
   * @param notificationIds 通知IDリスト
   * @returns 
   */
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

  /**
   * ユーザーの通知を既読にする
   * @param userId ユーザーID
   * @returns 
   */
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

  /**
   * ユーザーの未読通知数を取得
   * @param userId ユーザーID
   * @returns 未読通知数
   */
  async getUnreadCount(userId: string): Promise<number> {
    return this.prisma.notification.count({
      where: {
        userId,
        isRead: false,
      },
    });
  }

  /**
   * ユーザーの通知数を取得
   * @param userId ユーザーID
   * @param type 通知種類
   * @returns 通知数
   */
  async getCountByType(userId: string, type: string): Promise<number> {
    return this.prisma.notification.count({
      where: {
        userId,
        type: type as NotificationType,
      },
    });
  }

  /**
   * スケジュール通知を取得
   * @param before 前の日時
   * @returns 通知リスト
   */
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

  /**
   * 過ぎたスケジュール通知を取得
   * @returns 通知リスト
   */
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

  /**
   * 通知を送信済みにする
   * @param notificationIds 通知IDリスト
   * @param sentAt 送信時刻
   * @returns 
   */
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

  /**
   * ユーザーの通知設定を取得
   * @param userId ユーザーID
   * @returns 通知設定
   */
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
      taskDeadline: record.taskDeadline as Prisma.JsonValue,
      manhourThreshold: record.manhourThreshold as Prisma.JsonValue,
      scheduleDelay: record.scheduleDelay,
      taskAssignment: record.taskAssignment,
      projectStatusChange: record.projectStatusChange,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });
  }

  /**
   * ユーザーの通知設定を保存
   * @param preference 通知設定
   * @returns 通知設定
   */
  async savePreference(preference: NotificationPreference): Promise<NotificationPreference> {
    const record = await this.prisma.notificationPreference.create({
      data: {
        userId: preference.userId,
        enablePush: preference.enablePush,
        enableInApp: preference.enableInApp,
        enableEmail: preference.enableEmail,
        taskDeadline: preference.taskDeadline as unknown as Prisma.InputJsonValue,
        manhourThreshold: preference.manhourThreshold as unknown as Prisma.InputJsonValue,
        scheduleDelay: preference.scheduleDelay,
        taskAssignment: preference.taskAssignment,
        projectStatusChange: preference.projectStatusChange,
      },
    });

    return NotificationPreference.createFromDb({
      id: record.id,
      userId: record.userId,
      enablePush: record.enablePush,
      enableInApp: record.enableInApp,
      enableEmail: record.enableEmail,
      taskDeadline: record.taskDeadline as Prisma.JsonValue,
      manhourThreshold: record.manhourThreshold as Prisma.JsonValue,
      scheduleDelay: record.scheduleDelay,
      taskAssignment: record.taskAssignment,
      projectStatusChange: record.projectStatusChange,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });
  }

  /**
   * ユーザーの通知設定を更新
   * @param preference 通知設定
   * @returns 通知設定
   */
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
        taskDeadline: preference.taskDeadline as unknown as Prisma.InputJsonValue,
        manhourThreshold: preference.manhourThreshold as unknown as Prisma.InputJsonValue,
        scheduleDelay: preference.scheduleDelay,
        taskAssignment: preference.taskAssignment,
        projectStatusChange: preference.projectStatusChange,
      },
    });

    return NotificationPreference.createFromDb({
      id: record.id,
      userId: record.userId,
      enablePush: record.enablePush,
      enableInApp: record.enableInApp,
      enableEmail: record.enableEmail,
      taskDeadline: record.taskDeadline as Prisma.JsonValue,
      manhourThreshold: record.manhourThreshold as Prisma.JsonValue,
      scheduleDelay: record.scheduleDelay,
      taskAssignment: record.taskAssignment,
      projectStatusChange: record.projectStatusChange,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });
  }

  /**
   * ユーザーのPush通知設定を保存
   * @param userId ユーザーID
   * @param subscription Push通知設定
   * @returns 
   */
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

  /**
   * ユーザーのPush通知設定を取得
   * @param userId ユーザーID
   * @returns Push通知設定リスト
   */
  async findPushSubscriptionsByUserId(userId: string): Promise<PushSubscriptionData[]> {
    const records = await this.prisma.pushSubscription.findMany({
      where: {
        userId,
        isActive: true,
      },
    });

    return records.map(record => ({
      endpoint: record.endpoint,
      keys: record.keys as { p256dh: string; auth: string },
      userAgent: record.userAgent || undefined,
    }));
  }

  /**
   * ユーザーのPush通知設定を削除
   * @param userId ユーザーID
   * @param endpoint エンドポイント
   * @returns 
   */
  async removePushSubscription(userId: string, endpoint?: string): Promise<void> {
    const where: Prisma.PushSubscriptionWhereInput = { userId };

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
        keys: record.keys as { p256dh: string; auth: string },
        userAgent: record.userAgent || undefined,
      },
    }));
  }

  /**
   * 古い通知を削除
   * @param beforeDate 削除する日時
   * @returns 削除された通知数
   */
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

  private toDomainModel(record: Prisma.NotificationGetPayload<Record<string, never>>): Notification {
    const data = record.data ? JSON.parse(record.data as string) : undefined;

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
      readAt: record.readAt ?? undefined,
      scheduledAt: record.scheduledAt ?? undefined,
      sentAt: record.sentAt ?? undefined,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });
  }
}