import { NotificationTypeVO, NotificationType } from './notification-type';
import { NotificationPriorityVO, NotificationPriority } from './notification-priority';
import { NotificationChannelVO, NotificationChannel } from './notification-channel';

export interface NotificationData {
  taskId?: number;
  taskNo?: string;
  projectId?: string;
  projectName?: string;
  phaseId?: number;
  phaseName?: string;
  daysRemaining?: number;
  actualHours?: number;
  plannedHours?: number;
  percentage?: number;
  delayedTaskCount?: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}

export class Notification {
  public readonly id?: number;
  public readonly userId: string;
  public readonly type: NotificationTypeVO;
  public readonly priority: NotificationPriorityVO;
  public readonly title: string;
  public readonly message: string;
  public readonly data?: NotificationData;
  public readonly channels: NotificationChannelVO[];
  public readonly isRead: boolean;
  public readonly readAt?: Date;
  public readonly scheduledAt?: Date;
  public readonly sentAt?: Date;
  public readonly createdAt?: Date;
  public readonly updatedAt?: Date;

  private constructor(args: {
    id?: number;
    userId: string;
    type: NotificationTypeVO;
    priority: NotificationPriorityVO;
    title: string;
    message: string;
    data?: NotificationData;
    channels: NotificationChannelVO[];
    isRead?: boolean;
    readAt?: Date;
    scheduledAt?: Date;
    sentAt?: Date;
    createdAt?: Date;
    updatedAt?: Date;
  }) {
    this.id = args.id;
    this.userId = args.userId;
    this.type = args.type;
    this.priority = args.priority;
    this.title = args.title;
    this.message = args.message;
    this.data = args.data;
    this.channels = args.channels;
    this.isRead = args.isRead ?? false;
    this.readAt = args.readAt;
    this.scheduledAt = args.scheduledAt;
    this.sentAt = args.sentAt;
    this.createdAt = args.createdAt;
    this.updatedAt = args.updatedAt;
  }

  public static create(args: {
    userId: string;
    type: NotificationType;
    priority: NotificationPriority;
    title: string;
    message: string;
    data?: NotificationData;
    channels?: NotificationChannel[];
    scheduledAt?: Date;
  }): Notification {
    const channels = args.channels?.map(channel => NotificationChannelVO.create(channel)) ?? [
      NotificationChannelVO.create(NotificationChannel.PUSH),
      NotificationChannelVO.create(NotificationChannel.IN_APP),
    ];

    return new Notification({
      userId: args.userId,
      type: NotificationTypeVO.create(args.type),
      priority: NotificationPriorityVO.create(args.priority),
      title: args.title,
      message: args.message,
      data: args.data,
      channels,
      scheduledAt: args.scheduledAt,
    });
  }

  public static createFromDb(args: {
    id: number;
    userId: string;
    type: string;
    priority: string;
    title: string;
    message: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data?: any;
    channels: string[];
    isRead: boolean;
    readAt?: Date;
    scheduledAt?: Date;
    sentAt?: Date;
    createdAt: Date;
    updatedAt: Date;
  }): Notification {
    return new Notification({
      id: args.id,
      userId: args.userId,
      type: NotificationTypeVO.fromString(args.type),
      priority: NotificationPriorityVO.fromString(args.priority),
      title: args.title,
      message: args.message,
      data: args.data,
      channels: args.channels.map(channel => NotificationChannelVO.fromString(channel)),
      isRead: args.isRead,
      readAt: args.readAt,
      scheduledAt: args.scheduledAt,
      sentAt: args.sentAt,
      createdAt: args.createdAt,
      updatedAt: args.updatedAt,
    });
  }

  public markAsRead(readAt: Date = new Date()): Notification {
    if (this.isRead) {
      return this; // 既に既読の場合は変更しない
    }

    return new Notification({
      id: this.id,
      userId: this.userId,
      type: this.type,
      priority: this.priority,
      title: this.title,
      message: this.message,
      data: this.data,
      channels: this.channels,
      isRead: true,
      readAt,
      scheduledAt: this.scheduledAt,
      sentAt: this.sentAt,
      createdAt: this.createdAt,
      updatedAt: new Date(),
    });
  }

  public markAsSent(sentAt: Date = new Date()): Notification {
    return new Notification({
      id: this.id,
      userId: this.userId,
      type: this.type,
      priority: this.priority,
      title: this.title,
      message: this.message,
      data: this.data,
      channels: this.channels,
      isRead: this.isRead,
      readAt: this.readAt,
      scheduledAt: this.scheduledAt,
      sentAt,
      createdAt: this.createdAt,
      updatedAt: new Date(),
    });
  }

  public isScheduled(): boolean {
    return this.scheduledAt !== undefined && this.scheduledAt > new Date();
  }

  public isSent(): boolean {
    return this.sentAt !== undefined;
  }

  public isPending(): boolean {
    return !this.isSent() && !this.isScheduled();
  }

  public isOverdue(): boolean {
    return this.scheduledAt !== undefined &&
      this.scheduledAt < new Date() &&
      !this.isSent();
  }

  public shouldSendToChannel(channel: NotificationChannelVO): boolean {
    return this.channels.some(c => c.equals(channel));
  }

  public getActionUrl(): string | undefined {
    if (!this.data) return undefined;

    switch (this.type.getValue()) {
      case NotificationType.TASK_DEADLINE_WARNING:
      case NotificationType.TASK_DEADLINE_OVERDUE:
      case NotificationType.TASK_MANHOUR_WARNING:
      case NotificationType.TASK_MANHOUR_EXCEEDED:
      case NotificationType.TASK_ASSIGNED:
      case NotificationType.TASK_UPDATED:
        if (this.data.taskId && this.data.projectId) {
          return `/projects/${this.data.projectId}/tasks/${this.data.taskId}`;
        }
        break;
      case NotificationType.SCHEDULE_DELAY:
      case NotificationType.PROJECT_STATUS_CHANGED:
        if (this.data.projectId) {
          return `/projects/${this.data.projectId}`;
        }
        break;
    }

    return undefined;
  }

  public equals(other: Notification): boolean {
    return this.id !== undefined &&
      other.id !== undefined &&
      this.id === other.id;
  }
}