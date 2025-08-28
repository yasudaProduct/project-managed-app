export interface TaskDeadlineSettings {
  days: number[]; // 期限前の何日前に通知するか
}

export interface ManhourThresholdSettings {
  percentages: number[]; // 何%到達時に通知するか
}

export class NotificationPreference {
  public readonly id?: number;
  public readonly userId: string;
  public readonly enablePush: boolean;
  public readonly enableInApp: boolean;
  public readonly enableEmail: boolean;
  public readonly taskDeadline: TaskDeadlineSettings;
  public readonly manhourThreshold: ManhourThresholdSettings;
  public readonly scheduleDelay: boolean;
  public readonly taskAssignment: boolean;
  public readonly projectStatusChange: boolean;
  public readonly quietHoursStart?: number; // 0-23
  public readonly quietHoursEnd?: number;   // 0-23
  public readonly createdAt?: Date;
  public readonly updatedAt?: Date;

  private constructor(args: {
    id?: number;
    userId: string;
    enablePush?: boolean;
    enableInApp?: boolean;
    enableEmail?: boolean;
    taskDeadline?: TaskDeadlineSettings;
    manhourThreshold?: ManhourThresholdSettings;
    scheduleDelay?: boolean;
    taskAssignment?: boolean;
    projectStatusChange?: boolean;
    quietHoursStart?: number;
    quietHoursEnd?: number;
    createdAt?: Date;
    updatedAt?: Date;
  }) {
    this.id = args.id;
    this.userId = args.userId;
    this.enablePush = args.enablePush ?? true;
    this.enableInApp = args.enableInApp ?? true;
    this.enableEmail = args.enableEmail ?? false;
    this.taskDeadline = args.taskDeadline ?? { days: [3, 1, 0] };
    this.manhourThreshold = args.manhourThreshold ?? { percentages: [80, 100, 120] };
    this.scheduleDelay = args.scheduleDelay ?? true;
    this.taskAssignment = args.taskAssignment ?? true;
    this.projectStatusChange = args.projectStatusChange ?? true;
    this.quietHoursStart = args.quietHoursStart;
    this.quietHoursEnd = args.quietHoursEnd;
    this.createdAt = args.createdAt;
    this.updatedAt = args.updatedAt;
  }

  public static createDefault(userId: string): NotificationPreference {
    return new NotificationPreference({ userId });
  }

  public static create(args: {
    userId: string;
    enablePush?: boolean;
    enableInApp?: boolean;
    enableEmail?: boolean;
    taskDeadline?: TaskDeadlineSettings;
    manhourThreshold?: ManhourThresholdSettings;
    scheduleDelay?: boolean;
    taskAssignment?: boolean;
    projectStatusChange?: boolean;
    quietHoursStart?: number;
    quietHoursEnd?: number;
  }): NotificationPreference {
    return new NotificationPreference(args);
  }

  public static createFromDb(args: {
    id: number;
    userId: string;
    enablePush: boolean;
    enableInApp: boolean;
    enableEmail: boolean;
    taskDeadline: any;
    manhourThreshold: any;
    scheduleDelay: boolean;
    taskAssignment: boolean;
    projectStatusChange: boolean;
    quietHoursStart?: number;
    quietHoursEnd?: number;
    createdAt: Date;
    updatedAt: Date;
  }): NotificationPreference {
    return new NotificationPreference({
      id: args.id,
      userId: args.userId,
      enablePush: args.enablePush,
      enableInApp: args.enableInApp,
      enableEmail: args.enableEmail,
      taskDeadline: args.taskDeadline,
      manhourThreshold: args.manhourThreshold,
      scheduleDelay: args.scheduleDelay,
      taskAssignment: args.taskAssignment,
      projectStatusChange: args.projectStatusChange,
      quietHoursStart: args.quietHoursStart,
      quietHoursEnd: args.quietHoursEnd,
      createdAt: args.createdAt,
      updatedAt: args.updatedAt,
    });
  }

  public update(args: {
    enablePush?: boolean;
    enableInApp?: boolean;
    enableEmail?: boolean;
    taskDeadline?: TaskDeadlineSettings;
    manhourThreshold?: ManhourThresholdSettings;
    scheduleDelay?: boolean;
    taskAssignment?: boolean;
    projectStatusChange?: boolean;
    quietHoursStart?: number;
    quietHoursEnd?: number;
  }): NotificationPreference {
    return new NotificationPreference({
      id: this.id,
      userId: this.userId,
      enablePush: args.enablePush ?? this.enablePush,
      enableInApp: args.enableInApp ?? this.enableInApp,
      enableEmail: args.enableEmail ?? this.enableEmail,
      taskDeadline: args.taskDeadline ?? this.taskDeadline,
      manhourThreshold: args.manhourThreshold ?? this.manhourThreshold,
      scheduleDelay: args.scheduleDelay ?? this.scheduleDelay,
      taskAssignment: args.taskAssignment ?? this.taskAssignment,
      projectStatusChange: args.projectStatusChange ?? this.projectStatusChange,
      quietHoursStart: args.quietHoursStart ?? this.quietHoursStart,
      quietHoursEnd: args.quietHoursEnd ?? this.quietHoursEnd,
      createdAt: this.createdAt,
      updatedAt: new Date(),
    });
  }

  public isInQuietHours(time: Date = new Date()): boolean {
    if (this.quietHoursStart === undefined || this.quietHoursEnd === undefined) {
      return false;
    }

    const currentHour = time.getHours();
    const startHour = this.quietHoursStart;
    const endHour = this.quietHoursEnd;

    if (startHour <= endHour) {
      return currentHour >= startHour && currentHour < endHour;
    } else {
      return currentHour >= startHour || currentHour < endHour;
    }
  }

  public shouldNotifyForTaskDeadline(daysRemaining: number): boolean {
    return this.taskDeadline.days.includes(daysRemaining);
  }

  public shouldNotifyForManhourThreshold(percentage: number): boolean {
    return this.manhourThreshold.percentages.some(threshold => 
      percentage >= threshold && percentage < threshold + 20 // 20%の範囲内
    );
  }

  public getPushChannelsEnabled(): string[] {
    const channels: string[] = [];
    
    if (this.enableInApp) {
      channels.push('IN_APP');
    }
    
    if (this.enablePush) {
      channels.push('PUSH');
    }
    
    if (this.enableEmail) {
      channels.push('EMAIL');
    }
    
    return channels;
  }

  public validateQuietHours(): boolean {
    if (this.quietHoursStart === undefined && this.quietHoursEnd === undefined) {
      return true;
    }
    
    if (this.quietHoursStart === undefined || this.quietHoursEnd === undefined) {
      return false; // 片方だけが設定されているのは無効
    }
    
    return this.quietHoursStart >= 0 && 
           this.quietHoursStart <= 23 && 
           this.quietHoursEnd >= 0 && 
           this.quietHoursEnd <= 23;
  }
}