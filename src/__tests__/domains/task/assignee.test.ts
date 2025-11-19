import { Assignee } from "@/domains/task/assignee";

describe('Assignee', () => {
  describe('create', () => {
    it('名前と表示名から担当者を作成できること', () => {
      const assignee = Assignee.create({
        name: 'yamada',
        displayName: '山田太郎'
      });

      expect(assignee).toBeInstanceOf(Assignee);
      expect(assignee.id).toBeUndefined();
      expect(assignee.name).toBe('yamada');
      expect(assignee.displayName).toBe('山田太郎');
    });
  });

  describe('createFromDb', () => {
    it('ID、名前、表示名から担当者を作成できること', () => {
      const assignee = Assignee.createFromDb({
        id: 1,
        name: 'yamada',
        displayName: '山田太郎'
      });

      expect(assignee).toBeInstanceOf(Assignee);
      expect(assignee.id).toBe(1);
      expect(assignee.name).toBe('yamada');
      expect(assignee.displayName).toBe('山田太郎');
    });
  });

});