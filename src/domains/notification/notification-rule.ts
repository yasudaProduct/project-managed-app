import { NotificationTypeVO, NotificationType } from './notification-type';
import { NotificationPriorityVO, NotificationPriority } from './notification-priority';
import { NotificationChannelVO, NotificationChannel } from './notification-channel';

export interface NotificationRuleCondition {
  type: string;
  field: string;
  operator: 'eq' | 'gte' | 'lte' | 'gt' | 'lt' | 'in' | 'contains';
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  value: any;
}

export class NotificationRule {
  public readonly id?: number;
  public readonly name: string;
  public readonly type: NotificationTypeVO;
  public readonly priority: NotificationPriorityVO;
  public readonly channels: NotificationChannelVO[];
  public readonly conditions: NotificationRuleCondition[];
  public readonly titleTemplate: string;
  public readonly messageTemplate: string;
  public readonly isActive: boolean;
  public readonly createdAt?: Date;
  public readonly updatedAt?: Date;

  private constructor(args: {
    id?: number;
    name: string;
    type: NotificationTypeVO;
    priority: NotificationPriorityVO;
    channels: NotificationChannelVO[];
    conditions: NotificationRuleCondition[];
    titleTemplate: string;
    messageTemplate: string;
    isActive?: boolean;
    createdAt?: Date;
    updatedAt?: Date;
  }) {
    this.id = args.id;
    this.name = args.name;
    this.type = args.type;
    this.priority = args.priority;
    this.channels = args.channels;
    this.conditions = args.conditions;
    this.titleTemplate = args.titleTemplate;
    this.messageTemplate = args.messageTemplate;
    this.isActive = args.isActive ?? true;
    this.createdAt = args.createdAt;
    this.updatedAt = args.updatedAt;
  }

  public static create(args: {
    name: string;
    type: NotificationType;
    priority: NotificationPriority;
    channels: NotificationChannel[];
    conditions: NotificationRuleCondition[];
    titleTemplate: string;
    messageTemplate: string;
    isActive?: boolean;
  }): NotificationRule {
    return new NotificationRule({
      name: args.name,
      type: NotificationTypeVO.create(args.type),
      priority: NotificationPriorityVO.create(args.priority),
      channels: args.channels.map(c => NotificationChannelVO.create(c)),
      conditions: args.conditions,
      titleTemplate: args.titleTemplate,
      messageTemplate: args.messageTemplate,
      isActive: args.isActive,
    });
  }

  public static createFromDb(args: {
    id: number;
    name: string;
    type: string;
    priority: string;
    channels: string[];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    conditions: any;
    titleTemplate: string;
    messageTemplate: string;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
  }): NotificationRule {
    return new NotificationRule({
      id: args.id,
      name: args.name,
      type: NotificationTypeVO.fromString(args.type),
      priority: NotificationPriorityVO.fromString(args.priority),
      channels: args.channels.map(c => NotificationChannelVO.fromString(c)),
      conditions: args.conditions,
      titleTemplate: args.titleTemplate,
      messageTemplate: args.messageTemplate,
      isActive: args.isActive,
      createdAt: args.createdAt,
      updatedAt: args.updatedAt,
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public evaluateConditions(data: Record<string, any>): boolean {
    if (this.conditions.length === 0) {
      return true;
    }

    return this.conditions.every(condition => this.evaluateCondition(condition, data));
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private evaluateCondition(condition: NotificationRuleCondition, data: Record<string, any>): boolean {
    const fieldValue = this.getFieldValue(condition.field, data);

    switch (condition.operator) {
      case 'eq':
        return fieldValue === condition.value;
      case 'gte':
        return fieldValue >= condition.value;
      case 'lte':
        return fieldValue <= condition.value;
      case 'gt':
        return fieldValue > condition.value;
      case 'lt':
        return fieldValue < condition.value;
      case 'in':
        return Array.isArray(condition.value) && condition.value.includes(fieldValue);
      case 'contains':
        return typeof fieldValue === 'string' &&
          typeof condition.value === 'string' &&
          fieldValue.includes(condition.value);
      default:
        return false;
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private getFieldValue(field: string, data: Record<string, any>): any {
    const fieldParts = field.split('.');
    let value = data;

    for (const part of fieldParts) {
      if (value === null || value === undefined) {
        return undefined;
      }
      value = value[part];
    }

    return value;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public generateTitle(data: Record<string, any>): string {
    return this.interpolateTemplate(this.titleTemplate, data);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public generateMessage(data: Record<string, any>): string {
    return this.interpolateTemplate(this.messageTemplate, data);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private interpolateTemplate(template: string, data: Record<string, any>): string {
    return template.replace(/\{\{(\w+(?:\.\w+)*)\}\}/g, (match, field) => {
      const value = this.getFieldValue(field, data);
      return value !== undefined ? String(value) : match;
    });
  }

  public activate(): NotificationRule {
    if (this.isActive) return this;

    return new NotificationRule({
      id: this.id,
      name: this.name,
      type: this.type,
      priority: this.priority,
      channels: this.channels,
      conditions: this.conditions,
      titleTemplate: this.titleTemplate,
      messageTemplate: this.messageTemplate,
      isActive: true,
      createdAt: this.createdAt,
      updatedAt: new Date(),
    });
  }

  public deactivate(): NotificationRule {
    if (!this.isActive) return this;

    return new NotificationRule({
      id: this.id,
      name: this.name,
      type: this.type,
      priority: this.priority,
      channels: this.channels,
      conditions: this.conditions,
      titleTemplate: this.titleTemplate,
      messageTemplate: this.messageTemplate,
      isActive: false,
      createdAt: this.createdAt,
      updatedAt: new Date(),
    });
  }

  public static getDefaultRules(): NotificationRule[] {
    return [
      // タスク期限警告
      NotificationRule.create({
        name: 'タスク期限警告（3日前）',
        type: NotificationType.TASK_DEADLINE_WARNING,
        priority: NotificationPriority.MEDIUM,
        channels: [NotificationChannel.PUSH, NotificationChannel.IN_APP],
        conditions: [
          { type: 'task', field: 'daysRemaining', operator: 'eq', value: 3 }
        ],
        titleTemplate: 'タスク期限警告',
        messageTemplate: '「{{taskName}}」の期限が{{daysRemaining}}日後です',
      }),

      // タスク期限超過
      NotificationRule.create({
        name: 'タスク期限超過',
        type: NotificationType.TASK_DEADLINE_OVERDUE,
        priority: NotificationPriority.URGENT,
        channels: [NotificationChannel.PUSH, NotificationChannel.IN_APP, NotificationChannel.EMAIL],
        conditions: [
          { type: 'task', field: 'daysOverdue', operator: 'gt', value: 0 }
        ],
        titleTemplate: 'タスク期限超過',
        messageTemplate: '「{{taskName}}」が期限を{{daysOverdue}}日超過しています',
      }),

      // 工数超過
      NotificationRule.create({
        name: '工数超過警告',
        type: NotificationType.TASK_MANHOUR_EXCEEDED,
        priority: NotificationPriority.HIGH,
        channels: [NotificationChannel.PUSH, NotificationChannel.IN_APP],
        conditions: [
          { type: 'task', field: 'manhourPercentage', operator: 'gte', value: 100 }
        ],
        titleTemplate: '工数超過',
        messageTemplate: '「{{taskName}}」の実績工数が予定の{{manhourPercentage}}%に達しました',
      }),
    ];
  }
}