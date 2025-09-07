import { NotificationType } from "@/types/notification";

/**
 * 通知タイプ値オブジェクト
 */
export class NotificationTypeVO {
  private constructor(private readonly value: NotificationType) { }

  public getValue(): NotificationType {
    return this.value;
  }

  public static create(value: NotificationType): NotificationTypeVO {
    return new NotificationTypeVO(value);
  }

  public static fromString(value: string): NotificationTypeVO {
    const enumValue = Object.values(NotificationType).find(v => v === value);
    if (!enumValue) {
      throw new Error(`Invalid notification type: ${value}`);
    }
    return new NotificationTypeVO(enumValue);
  }

  public equals(other: NotificationTypeVO): boolean {
    return this.value === other.value;
  }
}