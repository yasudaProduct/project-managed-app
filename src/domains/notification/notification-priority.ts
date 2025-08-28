export enum NotificationPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  URGENT = 'URGENT',
}

export class NotificationPriorityVO {
  private constructor(private readonly value: NotificationPriority) {}

  public getValue(): NotificationPriority {
    return this.value;
  }

  public getDisplayName(): string {
    switch (this.value) {
      case NotificationPriority.LOW:
        return '低';
      case NotificationPriority.MEDIUM:
        return '中';
      case NotificationPriority.HIGH:
        return '高';
      case NotificationPriority.URGENT:
        return '緊急';
      default:
        return '不明';
    }
  }

  public getNumericValue(): number {
    switch (this.value) {
      case NotificationPriority.LOW:
        return 1;
      case NotificationPriority.MEDIUM:
        return 2;
      case NotificationPriority.HIGH:
        return 3;
      case NotificationPriority.URGENT:
        return 4;
      default:
        return 0;
    }
  }

  public getColor(): string {
    switch (this.value) {
      case NotificationPriority.LOW:
        return 'gray';
      case NotificationPriority.MEDIUM:
        return 'blue';
      case NotificationPriority.HIGH:
        return 'orange';
      case NotificationPriority.URGENT:
        return 'red';
      default:
        return 'gray';
    }
  }

  public static create(value: NotificationPriority): NotificationPriorityVO {
    return new NotificationPriorityVO(value);
  }

  public static fromString(value: string): NotificationPriorityVO {
    const enumValue = Object.values(NotificationPriority).find(v => v === value);
    if (!enumValue) {
      throw new Error(`Invalid notification priority: ${value}`);
    }
    return new NotificationPriorityVO(enumValue);
  }

  public static comparePriority(a: NotificationPriorityVO, b: NotificationPriorityVO): number {
    return b.getNumericValue() - a.getNumericValue(); // 降順（高い優先度が先）
  }

  public equals(other: NotificationPriorityVO): boolean {
    return this.value === other.value;
  }

  public isHigherThan(other: NotificationPriorityVO): boolean {
    return this.getNumericValue() > other.getNumericValue();
  }

  public isLowerThan(other: NotificationPriorityVO): boolean {
    return this.getNumericValue() < other.getNumericValue();
  }
}