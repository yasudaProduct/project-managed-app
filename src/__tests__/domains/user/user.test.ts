import { User } from "@/domains/user/user";

describe('User', () => {
  describe('create', () => {
    it('ユーザーを作成できること', () => {
      const user = User.create({
        name: 'test_user',
        displayName: 'テストユーザー',
        email: 'test_user@example.com',
        costPerHour: 10000
      });

      expect(user).toBeInstanceOf(User);
      expect(user.id).toBeUndefined();
      expect(user.name).toBe('test_user');
      expect(user.displayName).toBe('テストユーザー');
      expect(user.email).toBe('test_user@example.com');
      expect(user.costPerHour).toBe(10000);
    });

    it('メールアドレスが不正な場合はエラーが発生する', () => {
      expect(() => {
        User.create({
          name: 'test_user',
          displayName: 'テストユーザー',
          email: 'test_user@example',
          costPerHour: 10000
        });
      }).toThrow('メールアドレスが不正です。');

      expect(() => {
        User.create({
          name: 'test_user',
          displayName: 'テストユーザー',
          email: 'test_userexample.com',
          costPerHour: 10000
        });
      }).toThrow('メールアドレスが不正です。');
    });

    it('人員原価が0未満の場合はエラーが発生する', () => {
      expect(() => {
        User.create({
          name: 'test_user',
          displayName: 'テストユーザー',
          email: 'test_user@example.com',
          costPerHour: -1000
        });
      }).toThrow('原価は0以上の数値である必要があります。');
    });

    it('人員原価が0の場合は許容される', () => {
      expect(() => {
        const user = User.create({
          name: 'test_user',
          displayName: 'テストユーザー',
          email: 'test_user@example.com',
          costPerHour: 0
        });
        expect(user.costPerHour).toBe(0);
      }).not.toThrow();
    });
  });

  describe('createFromDb', () => {
    it('ユーザーを作成できること', () => {
      const user = User.createFromDb({
        id: 'user-id-1',
        name: 'test_user',
        displayName: 'テストユーザー',
        email: 'test_user@example.com',
        costPerHour: 1000,
        password: 'password',
        createdAt: new Date(),
        updatedAt: new Date()
      });

      expect(user).toBeInstanceOf(User);
      expect(user.id).toBe('user-id-1');
      expect(user.name).toBe('test_user');
      expect(user.displayName).toBe('テストユーザー');
      expect(user.email).toBe('test_user@example.com');
      expect(user.costPerHour).toBe(1000);
      expect(user.password).toBe('password');
      expect(user.createdAt).toBeInstanceOf(Date);
      expect(user.updatedAt).toBeInstanceOf(Date);
    });
  });

  describe('hasPassword', () => {
    it('パスワードが設定されている場合はtrueを返す', () => {
      const user = User.createFromDb({
        id: 'user-id-1',
        name: 'test_user',
        displayName: 'テストユーザー',
        email: 'test_user@example.com',
        costPerHour: 10000,
        password: 'password',
        createdAt: new Date(),
        updatedAt: new Date()
      });

      expect(user.hasPassword()).toBe(true);
    });

    it('パスワードが設定されていない場合はfalseを返す', () => {
      const user = User.createFromDb({
        id: 'user-id-1',
        name: 'test_user',
        displayName: 'テストユーザー',
        email: 'test_user@example.com',
        costPerHour: 10000,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      expect(user.hasPassword()).toBe(false);
    });
  });
});