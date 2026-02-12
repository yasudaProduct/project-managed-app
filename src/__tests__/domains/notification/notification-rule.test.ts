import { NotificationRule } from '@/domains/notification/notification-rule';
import { NotificationType } from '@/types/notification';
import { NotificationPriority } from '@/domains/notification/notification-priority';
import { NotificationChannel } from '@/domains/notification/notification-channel';

describe('NotificationRule', () => {
  const createTestRule = (overrides = {}) => {
    return NotificationRule.create({
      name: 'テストルール',
      type: NotificationType.TASK_DEADLINE_WARNING,
      priority: NotificationPriority.HIGH,
      channels: [NotificationChannel.PUSH, NotificationChannel.IN_APP],
      conditions: [
        { type: 'task', field: 'daysRemaining', operator: 'lte' as const, value: 3 },
      ],
      titleTemplate: 'タスク期限警告: {{taskName}}',
      messageTemplate: '「{{taskName}}」の期限が{{daysRemaining}}日後です',
      ...overrides,
    });
  };

  describe('create', () => {
    it('ルールを作成できる', () => {
      const rule = createTestRule();

      expect(rule.name).toBe('テストルール');
      expect(rule.type.getValue()).toBe(NotificationType.TASK_DEADLINE_WARNING);
      expect(rule.priority.getValue()).toBe(NotificationPriority.HIGH);
      expect(rule.channels).toHaveLength(2);
      expect(rule.conditions).toHaveLength(1);
      expect(rule.isActive).toBe(true);
    });

    it('非アクティブで作成できる', () => {
      const rule = createTestRule({ isActive: false });
      expect(rule.isActive).toBe(false);
    });
  });

  describe('createFromDb', () => {
    it('DB値からルールを再構築できる', () => {
      const now = new Date();
      const rule = NotificationRule.createFromDb({
        id: 1,
        name: 'DBルール',
        type: 'TASK_DEADLINE_WARNING',
        priority: 'HIGH',
        channels: ['PUSH'],
        conditions: [{ type: 'task', field: 'daysRemaining', operator: 'eq', value: 3 }],
        titleTemplate: '{{taskName}}',
        messageTemplate: '{{taskName}}の期限',
        isActive: true,
        createdAt: now,
        updatedAt: now,
      });

      expect(rule.id).toBe(1);
      expect(rule.name).toBe('DBルール');
    });
  });

  describe('evaluateConditions', () => {
    it('条件が空の場合trueを返す', () => {
      const rule = createTestRule({ conditions: [] });
      expect(rule.evaluateConditions({})).toBe(true);
    });

    describe('eq演算子', () => {
      it('値が等しい場合trueを返す', () => {
        const rule = createTestRule({
          conditions: [{ type: 'task', field: 'status', operator: 'eq', value: 'ACTIVE' }],
        });
        expect(rule.evaluateConditions({ status: 'ACTIVE' })).toBe(true);
      });

      it('値が異なる場合falseを返す', () => {
        const rule = createTestRule({
          conditions: [{ type: 'task', field: 'status', operator: 'eq', value: 'ACTIVE' }],
        });
        expect(rule.evaluateConditions({ status: 'COMPLETED' })).toBe(false);
      });
    });

    describe('比較演算子', () => {
      it('gte: 以上の場合trueを返す', () => {
        const rule = createTestRule({
          conditions: [{ type: 'task', field: 'percentage', operator: 'gte', value: 80 }],
        });
        expect(rule.evaluateConditions({ percentage: 80 })).toBe(true);
        expect(rule.evaluateConditions({ percentage: 100 })).toBe(true);
        expect(rule.evaluateConditions({ percentage: 79 })).toBe(false);
      });

      it('gt: より大きい場合trueを返す', () => {
        const rule = createTestRule({
          conditions: [{ type: 'task', field: 'count', operator: 'gt', value: 0 }],
        });
        expect(rule.evaluateConditions({ count: 1 })).toBe(true);
        expect(rule.evaluateConditions({ count: 0 })).toBe(false);
      });

      it('lte: 以下の場合trueを返す', () => {
        const rule = createTestRule({
          conditions: [{ type: 'task', field: 'days', operator: 'lte', value: 3 }],
        });
        expect(rule.evaluateConditions({ days: 3 })).toBe(true);
        expect(rule.evaluateConditions({ days: 2 })).toBe(true);
        expect(rule.evaluateConditions({ days: 4 })).toBe(false);
      });

      it('lt: より小さい場合trueを返す', () => {
        const rule = createTestRule({
          conditions: [{ type: 'task', field: 'days', operator: 'lt', value: 3 }],
        });
        expect(rule.evaluateConditions({ days: 2 })).toBe(true);
        expect(rule.evaluateConditions({ days: 3 })).toBe(false);
      });
    });

    describe('in演算子', () => {
      it('配列に含まれる場合trueを返す', () => {
        const rule = createTestRule({
          conditions: [{ type: 'task', field: 'status', operator: 'in', value: ['ACTIVE', 'IN_PROGRESS'] }],
        });
        expect(rule.evaluateConditions({ status: 'ACTIVE' })).toBe(true);
        expect(rule.evaluateConditions({ status: 'COMPLETED' })).toBe(false);
      });
    });

    describe('contains演算子', () => {
      it('文字列が含まれる場合trueを返す', () => {
        const rule = createTestRule({
          conditions: [{ type: 'task', field: 'name', operator: 'contains', value: '設計' }],
        });
        expect(rule.evaluateConditions({ name: '基本設計レビュー' })).toBe(true);
        expect(rule.evaluateConditions({ name: '実装' })).toBe(false);
      });
    });

    describe('ネストされたフィールド', () => {
      it('ドット区切りでネストされたフィールドにアクセスできる', () => {
        const rule = createTestRule({
          conditions: [{ type: 'task', field: 'task.status', operator: 'eq', value: 'ACTIVE' }],
        });
        expect(rule.evaluateConditions({ task: { status: 'ACTIVE' } })).toBe(true);
      });

      it('存在しないパスの場合undefinedを返す', () => {
        const rule = createTestRule({
          conditions: [{ type: 'task', field: 'a.b.c', operator: 'eq', value: undefined }],
        });
        expect(rule.evaluateConditions({})).toBe(true);
      });
    });

    describe('複数条件（AND）', () => {
      it('全条件を満たす場合trueを返す', () => {
        const rule = createTestRule({
          conditions: [
            { type: 'task', field: 'status', operator: 'eq', value: 'ACTIVE' },
            { type: 'task', field: 'percentage', operator: 'gte', value: 80 },
          ],
        });
        expect(rule.evaluateConditions({ status: 'ACTIVE', percentage: 90 })).toBe(true);
      });

      it('一部の条件を満たさない場合falseを返す', () => {
        const rule = createTestRule({
          conditions: [
            { type: 'task', field: 'status', operator: 'eq', value: 'ACTIVE' },
            { type: 'task', field: 'percentage', operator: 'gte', value: 80 },
          ],
        });
        expect(rule.evaluateConditions({ status: 'ACTIVE', percentage: 50 })).toBe(false);
      });
    });
  });

  describe('generateTitle / generateMessage', () => {
    it('テンプレートを補間する', () => {
      const rule = createTestRule();
      const data = { taskName: '基本設計', daysRemaining: 3 };

      expect(rule.generateTitle(data)).toBe('タスク期限警告: 基本設計');
      expect(rule.generateMessage(data)).toBe('「基本設計」の期限が3日後です');
    });

    it('データがない場合テンプレートのまま残す', () => {
      const rule = createTestRule();

      expect(rule.generateTitle({})).toBe('タスク期限警告: {{taskName}}');
    });
  });

  describe('activate / deactivate', () => {
    it('非アクティブなルールをアクティブにする', () => {
      const rule = createTestRule({ isActive: false });
      const activated = rule.activate();

      expect(activated.isActive).toBe(true);
      expect(rule.isActive).toBe(false); // 元は変更されない
    });

    it('既にアクティブなルールをactivateすると自分自身を返す', () => {
      const rule = createTestRule({ isActive: true });
      const activated = rule.activate();

      expect(activated).toBe(rule);
    });

    it('アクティブなルールを非アクティブにする', () => {
      const rule = createTestRule({ isActive: true });
      const deactivated = rule.deactivate();

      expect(deactivated.isActive).toBe(false);
    });

    it('既に非アクティブなルールをdeactivateすると自分自身を返す', () => {
      const rule = createTestRule({ isActive: false });
      const deactivated = rule.deactivate();

      expect(deactivated).toBe(rule);
    });
  });

  describe('getDefaultRules', () => {
    it('デフォルトルールを3件返す', () => {
      const rules = NotificationRule.getDefaultRules();

      expect(rules).toHaveLength(3);
      expect(rules[0].name).toContain('タスク期限警告');
      expect(rules[1].name).toContain('タスク期限超過');
      expect(rules[2].name).toContain('工数超過');
    });

    it('デフォルトルールは全てアクティブ', () => {
      const rules = NotificationRule.getDefaultRules();

      rules.forEach(rule => {
        expect(rule.isActive).toBe(true);
      });
    });
  });
});
