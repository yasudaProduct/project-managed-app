import { NotificationRule } from '@/domains/notification/notification-rule';
import { NotificationType } from '@/types/notification';
import { NotificationPriority } from '@/domains/notification/notification-priority';
import { NotificationChannel } from '@/domains/notification/notification-channel';

describe('NotificationRule', () => {
  const createRule = (overrides?: Partial<Parameters<typeof NotificationRule.create>[0]>) =>
    NotificationRule.create({
      name: 'テストルール',
      type: NotificationType.TASK_DEADLINE_WARNING,
      priority: NotificationPriority.MEDIUM,
      channels: [NotificationChannel.PUSH],
      conditions: [],
      titleTemplate: 'テストタイトル',
      messageTemplate: 'テストメッセージ',
      ...overrides,
    });

  describe('create', () => {
    it('ルールを作成できる', () => {
      const rule = createRule();

      expect(rule.name).toBe('テストルール');
      expect(rule.type.getValue()).toBe(NotificationType.TASK_DEADLINE_WARNING);
      expect(rule.priority.getValue()).toBe(NotificationPriority.MEDIUM);
      expect(rule.isActive).toBe(true);
    });

    it('デフォルトでアクティブ状態になる', () => {
      const rule = createRule();
      expect(rule.isActive).toBe(true);
    });

    it('非アクティブで作成できる', () => {
      const rule = createRule({ isActive: false });
      expect(rule.isActive).toBe(false);
    });
  });

  describe('evaluateConditions', () => {
    it('条件が空の場合は常にtrueを返す', () => {
      const rule = createRule({ conditions: [] });
      expect(rule.evaluateConditions({})).toBe(true);
    });

    it('eq 演算子: 値が一致する場合にtrueを返す', () => {
      const rule = createRule({
        conditions: [{ type: 'task', field: 'status', operator: 'eq', value: 'COMPLETED' }],
      });

      expect(rule.evaluateConditions({ status: 'COMPLETED' })).toBe(true);
      expect(rule.evaluateConditions({ status: 'IN_PROGRESS' })).toBe(false);
    });

    it('gte 演算子: 以上の場合にtrueを返す', () => {
      const rule = createRule({
        conditions: [{ type: 'task', field: 'percentage', operator: 'gte', value: 80 }],
      });

      expect(rule.evaluateConditions({ percentage: 80 })).toBe(true);
      expect(rule.evaluateConditions({ percentage: 100 })).toBe(true);
      expect(rule.evaluateConditions({ percentage: 79 })).toBe(false);
    });

    it('lte 演算子: 以下の場合にtrueを返す', () => {
      const rule = createRule({
        conditions: [{ type: 'task', field: 'daysRemaining', operator: 'lte', value: 3 }],
      });

      expect(rule.evaluateConditions({ daysRemaining: 3 })).toBe(true);
      expect(rule.evaluateConditions({ daysRemaining: 1 })).toBe(true);
      expect(rule.evaluateConditions({ daysRemaining: 4 })).toBe(false);
    });

    it('gt 演算子: より大きい場合にtrueを返す', () => {
      const rule = createRule({
        conditions: [{ type: 'task', field: 'daysOverdue', operator: 'gt', value: 0 }],
      });

      expect(rule.evaluateConditions({ daysOverdue: 1 })).toBe(true);
      expect(rule.evaluateConditions({ daysOverdue: 0 })).toBe(false);
    });

    it('lt 演算子: より小さい場合にtrueを返す', () => {
      const rule = createRule({
        conditions: [{ type: 'task', field: 'progressRate', operator: 'lt', value: 50 }],
      });

      expect(rule.evaluateConditions({ progressRate: 49 })).toBe(true);
      expect(rule.evaluateConditions({ progressRate: 50 })).toBe(false);
    });

    it('in 演算子: 配列に含まれる場合にtrueを返す', () => {
      const rule = createRule({
        conditions: [{ type: 'task', field: 'status', operator: 'in', value: ['COMPLETED', 'CANCELLED'] }],
      });

      expect(rule.evaluateConditions({ status: 'COMPLETED' })).toBe(true);
      expect(rule.evaluateConditions({ status: 'CANCELLED' })).toBe(true);
      expect(rule.evaluateConditions({ status: 'IN_PROGRESS' })).toBe(false);
    });

    it('contains 演算子: 文字列を含む場合にtrueを返す', () => {
      const rule = createRule({
        conditions: [{ type: 'task', field: 'taskName', operator: 'contains', value: '設計' }],
      });

      expect(rule.evaluateConditions({ taskName: '基本設計レビュー' })).toBe(true);
      expect(rule.evaluateConditions({ taskName: 'コーディング' })).toBe(false);
    });

    it('contains 演算子: 文字列でない値にはfalseを返す', () => {
      const rule = createRule({
        conditions: [{ type: 'task', field: 'count', operator: 'contains', value: '10' }],
      });

      expect(rule.evaluateConditions({ count: 10 })).toBe(false);
    });

    it('ネストしたフィールドの値を取得できる', () => {
      const rule = createRule({
        conditions: [{ type: 'task', field: 'task.daysRemaining', operator: 'eq', value: 3 }],
      });

      expect(rule.evaluateConditions({ task: { daysRemaining: 3 } })).toBe(true);
      expect(rule.evaluateConditions({ task: { daysRemaining: 5 } })).toBe(false);
    });

    it('存在しないフィールドではundefinedが返る', () => {
      const rule = createRule({
        conditions: [{ type: 'task', field: 'nonexistent', operator: 'eq', value: undefined }],
      });

      expect(rule.evaluateConditions({})).toBe(true);
    });

    it('複数条件は全て満たす場合にのみtrueを返す', () => {
      const rule = createRule({
        conditions: [
          { type: 'task', field: 'daysRemaining', operator: 'lte', value: 3 },
          { type: 'task', field: 'status', operator: 'eq', value: 'IN_PROGRESS' },
        ],
      });

      expect(rule.evaluateConditions({ daysRemaining: 2, status: 'IN_PROGRESS' })).toBe(true);
      expect(rule.evaluateConditions({ daysRemaining: 2, status: 'COMPLETED' })).toBe(false);
      expect(rule.evaluateConditions({ daysRemaining: 5, status: 'IN_PROGRESS' })).toBe(false);
    });
  });

  describe('generateTitle / generateMessage', () => {
    it('テンプレート内のプレースホルダーが補間される', () => {
      const rule = createRule({
        titleTemplate: 'タスク期限警告',
        messageTemplate: '「{{taskName}}」の期限が{{daysRemaining}}日後です',
      });

      const data = { taskName: '基本設計', daysRemaining: 3 };

      expect(rule.generateTitle(data)).toBe('タスク期限警告');
      expect(rule.generateMessage(data)).toBe('「基本設計」の期限が3日後です');
    });

    it('データに存在しないキーはプレースホルダーのまま残る', () => {
      const rule = createRule({
        messageTemplate: '{{taskName}}は{{unknown}}です',
      });

      expect(rule.generateMessage({ taskName: 'テスト' })).toBe('テストは{{unknown}}です');
    });

    it('ネストしたフィールドの補間ができる', () => {
      const rule = createRule({
        messageTemplate: '残り{{task.daysRemaining}}日',
      });

      expect(rule.generateMessage({ task: { daysRemaining: 5 } })).toBe('残り5日');
    });
  });

  describe('activate / deactivate', () => {
    it('非アクティブなルールをアクティブにできる', () => {
      const rule = createRule({ isActive: false });
      const activated = rule.activate();

      expect(activated.isActive).toBe(true);
    });

    it('既にアクティブなルールはそのままのインスタンスを返す', () => {
      const rule = createRule({ isActive: true });
      const activated = rule.activate();

      expect(activated).toBe(rule);
    });

    it('アクティブなルールを非アクティブにできる', () => {
      const rule = createRule({ isActive: true });
      const deactivated = rule.deactivate();

      expect(deactivated.isActive).toBe(false);
    });

    it('既に非アクティブなルールはそのままのインスタンスを返す', () => {
      const rule = createRule({ isActive: false });
      const deactivated = rule.deactivate();

      expect(deactivated).toBe(rule);
    });
  });

  describe('getDefaultRules', () => {
    it('デフォルトルールが3つ返される', () => {
      const rules = NotificationRule.getDefaultRules();
      expect(rules).toHaveLength(3);
    });

    it('全てアクティブ状態である', () => {
      const rules = NotificationRule.getDefaultRules();
      rules.forEach(rule => {
        expect(rule.isActive).toBe(true);
      });
    });
  });
});
