export enum NotificationChannel {
  PUSH = 'PUSH',         // デスクトップ通知
  IN_APP = 'IN_APP',     // アプリ内通知
  EMAIL = 'EMAIL',       // メール通知
}

export class NotificationChannelVO {
  private constructor(private readonly value: NotificationChannel) {}

  public getValue(): NotificationChannel {
    return this.value;
  }

  public getDisplayName(): string {
    switch (this.value) {
      case NotificationChannel.PUSH:
        return 'デスクトップ通知';
      case NotificationChannel.IN_APP:
        return 'アプリ内通知';
      case NotificationChannel.EMAIL:
        return 'メール通知';
      default:
        return '不明なチャネル';
    }
  }

  public getDescription(): string {
    switch (this.value) {
      case NotificationChannel.PUSH:
        return 'ブラウザのプッシュ通知でお知らせします';
      case NotificationChannel.IN_APP:
        return 'アプリケーション内で通知を表示します';
      case NotificationChannel.EMAIL:
        return '登録されたメールアドレスに通知を送信します';
      default:
        return '';
    }
  }

  public static create(value: NotificationChannel): NotificationChannelVO {
    return new NotificationChannelVO(value);
  }

  public static fromString(value: string): NotificationChannelVO {
    const enumValue = Object.values(NotificationChannel).find(v => v === value);
    if (!enumValue) {
      throw new Error(`Invalid notification channel: ${value}`);
    }
    return new NotificationChannelVO(enumValue);
  }

  public static getAllChannels(): NotificationChannelVO[] {
    return Object.values(NotificationChannel).map(channel => 
      new NotificationChannelVO(channel)
    );
  }

  public equals(other: NotificationChannelVO): boolean {
    return this.value === other.value;
  }

  public isRealtime(): boolean {
    return this.value === NotificationChannel.PUSH || 
           this.value === NotificationChannel.IN_APP;
  }

  public requiresSubscription(): boolean {
    return this.value === NotificationChannel.PUSH;
  }
}