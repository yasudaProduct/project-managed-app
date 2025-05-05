import { User } from "@/domains/user/user";

describe('User', () => {
  describe('create', () => {
    it('名前と表示名からユーザーを作成できること', () => {
      const user = User.create({
        name: 'test_user',
        displayName: 'テストユーザー'
      });
      
      expect(user).toBeInstanceOf(User);
      expect(user.id).toBeUndefined();
      expect(user.name).toBe('test_user');
      expect(user.displayName).toBe('テストユーザー');
    });
  });
  
  describe('createFromDb', () => {
    it('ID、名前、表示名からユーザーを作成できること', () => {
      const user = User.createFromDb({
        id: 'user-id-1',
        name: 'test_user',
        displayName: 'テストユーザー'
      });
      
      expect(user).toBeInstanceOf(User);
      expect(user.id).toBe('user-id-1');
      expect(user.name).toBe('test_user');
      expect(user.displayName).toBe('テストユーザー');
    });
  });
  
  describe('isEqual', () => {
    it('同じIDのユーザーは等しいと判定されること', () => {
      const user1 = User.createFromDb({
        id: 'user-id-1',
        name: 'user1',
        displayName: 'ユーザー1'
      });
      
      const user2 = User.createFromDb({
        id: 'user-id-1',
        name: 'different_name',
        displayName: '別の表示名'
      });
      
      expect(user1.isEqual(user2)).toBe(true);
    });
    
    it('異なるIDのユーザーは等しくないと判定されること', () => {
      const user1 = User.createFromDb({
        id: 'user-id-1',
        name: 'user1',
        displayName: 'ユーザー1'
      });
      
      const user2 = User.createFromDb({
        id: 'user-id-2',
        name: 'user1',
        displayName: 'ユーザー1'
      });
      
      expect(user1.isEqual(user2)).toBe(false);
    });
    
    it('IDがundefinedの場合は等しくないと判定されること', () => {
      const user1 = User.create({
        name: 'user1',
        displayName: 'ユーザー1'
      });
      
      const user2 = User.create({
        name: 'user1',
        displayName: 'ユーザー1'
      });
      
      expect(user1.isEqual(user2)).toBe(false);
    });
  });
});