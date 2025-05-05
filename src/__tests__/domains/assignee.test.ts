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
        id: 'user-1',
        name: 'yamada',
        displayName: '山田太郎'
      });
      
      expect(assignee).toBeInstanceOf(Assignee);
      expect(assignee.id).toBe('user-1');
      expect(assignee.name).toBe('yamada');
      expect(assignee.displayName).toBe('山田太郎');
    });
  });
  
  describe('isEqual', () => {
    it('同じIDの担当者は等しいと判定されること', () => {
      const assignee1 = Assignee.createFromDb({
        id: 'user-1',
        name: 'yamada',
        displayName: '山田太郎'
      });
      
      const assignee2 = Assignee.createFromDb({
        id: 'user-1',
        name: 'tanaka',
        displayName: '田中花子'
      });
      
      expect(assignee1.isEqual(assignee2)).toBe(true);
    });
    
    it('異なるIDの担当者は等しくないと判定されること', () => {
      const assignee1 = Assignee.createFromDb({
        id: 'user-1',
        name: 'yamada',
        displayName: '山田太郎'
      });
      
      const assignee2 = Assignee.createFromDb({
        id: 'user-2',
        name: 'yamada',
        displayName: '山田太郎'
      });
      
      expect(assignee1.isEqual(assignee2)).toBe(false);
    });
  });
});