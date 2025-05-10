import { TaskId } from "@/domains/task/value-object/task-id";

describe('TaskId', () => {
  describe('create', () => {
    it('フェーズコードとシーケンス番号からタスクIDを作成できること', () => {
      const taskId = TaskId.create('D1', 1);
      expect(taskId).toBeInstanceOf(TaskId);
      expect(taskId.getValue()).toBe('D1-0001');
    });

    it('2桁のシーケンス番号を正しく4桁にパディングすること', () => {
      const taskId = TaskId.create('A1', 42);
      expect(taskId.getValue()).toBe('A1-0042');
    });

    it('3桁のシーケンス番号を正しく4桁にパディングすること', () => {
      const taskId = TaskId.create('B2', 123);
      expect(taskId.getValue()).toBe('B2-0123');
    });

    it('4桁のシーケンス番号をそのまま使用すること', () => {
      const taskId = TaskId.create('C10', 9876);
      expect(taskId.getValue()).toBe('C10-9876');
    });

    it('フェーズコードが1文字でない場合はエラーになること', () => {
      expect(() => {
        TaskId.create('XY', 1);
      }).toThrow('タスクIDのフォーマットが不正です。');
    });
  });

  describe('reconstruct', () => {
    it('正しいフォーマットの文字列からタスクIDを再構築できること', () => {
      const taskId = TaskId.reconstruct('D1-0001');
      expect(taskId).toBeInstanceOf(TaskId);
      expect(taskId.getValue()).toBe('D1-0001');
    });

    it('不正なフォーマットの文字列からは再構築できないこと', () => {
      expect(() => {
        TaskId.reconstruct('D0001');
      }).toThrow('タスクIDのフォーマットが不正です。');

      expect(() => {
        TaskId.reconstruct('D-001');
      }).toThrow('タスクIDのフォーマットが不正です。');

    });
  });

  describe('getValue', () => {
    it('タスクIDの値を取得できること', () => {
      const taskId = TaskId.create('D1', 1);
      expect(taskId.getValue()).toBe('D1-0001');
    });
  });
});