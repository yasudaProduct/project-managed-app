import { Milestone } from '@/domains/milestone/milestone';

describe('Milestone', () => {
  const milestoneArgs = {
    id: 1,
    name: 'マイルストーン1',
    date: new Date('2026-06-01T00:00:00.000Z'),
  };

  describe('constructor', () => {
    it('プロパティが正しく設定される', () => {
      const milestone = new Milestone(milestoneArgs);

      expect(milestone.id).toBe(1);
      expect(milestone.name).toBe('マイルストーン1');
      expect(milestone.date).toEqual(new Date('2026-06-01T00:00:00.000Z'));
    });
  });

  describe('create', () => {
    it('ファクトリメソッドでインスタンスを作成できる', () => {
      const milestone = Milestone.create(milestoneArgs);

      expect(milestone).toBeInstanceOf(Milestone);
      expect(milestone.id).toBe(milestoneArgs.id);
      expect(milestone.name).toBe(milestoneArgs.name);
      expect(milestone.date).toEqual(milestoneArgs.date);
    });
  });

  describe('rebuild', () => {
    it('rebuildでインスタンスを再構築できる', () => {
      const milestone = Milestone.rebuild(milestoneArgs);

      expect(milestone).toBeInstanceOf(Milestone);
      expect(milestone.id).toBe(milestoneArgs.id);
      expect(milestone.name).toBe(milestoneArgs.name);
      expect(milestone.date).toEqual(milestoneArgs.date);
    });
  });
});
