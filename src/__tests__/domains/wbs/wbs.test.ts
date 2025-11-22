import { Wbs } from "@/domains/wbs/wbs";

describe('Wbs', () => {
  describe('create', () => {
    it('名前、プロジェクトIDからWBSを作成できること', () => {
      const wbs = Wbs.create({
        name: 'テストWBS',
        projectId: 'project-1'
      });

      expect(wbs).toBeInstanceOf(Wbs);
      expect(wbs.id).toBe(undefined);
      expect(wbs.name).toBe('テストWBS');
      expect(wbs.projectId).toBe('project-1');
    });
  });

  describe('createFromDb', () => {
    it('ID、名前、プロジェクトIDからWBSを作成できること', () => {
      const wbs = Wbs.createFromDb({
        id: 1,
        name: 'テストWBS',
        projectId: 'project-1'
      });

      expect(wbs).toBeInstanceOf(Wbs);
      expect(wbs.id).toBe(1);
      expect(wbs.name).toBe('テストWBS');
      expect(wbs.projectId).toBe('project-1');
    });
  });

  describe('isEqual', () => {
    it('同じIDのWBSは等しいと判定されること', () => {
      const wbs1 = Wbs.create({
        name: 'テストWBS',
        projectId: 'project-1'
      });

      const wbs2 = Wbs.create({
        name: '異なる名前',
        projectId: 'project-2'
      });

      expect(wbs1.isEqual(wbs2)).toBe(true);
    });

    it('異なるIDのWBSは等しくないと判定されること', () => {
      const wbs1 = Wbs.create({
        name: 'テストWBS',
        projectId: 'project-1'
      });

      const wbs2 = Wbs.create({
        name: 'テストWBS',
        projectId: 'project-1'
      });

      expect(wbs1.isEqual(wbs2)).toBe(true);
    });
  });

  describe('updateName', () => {
    it('名前を更新できること', () => {
      const wbs = Wbs.create({
        name: 'テストWBS',
        projectId: 'project-1'
      });
      wbs.updateName('新しい名前');
      expect(wbs.name).toBe('新しい名前');
    });
  });
});