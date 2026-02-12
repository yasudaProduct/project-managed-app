import { User } from '@/domains/auth/user';

describe('User (auth)', () => {
  describe('create', () => {
    it('ユーザーを作成できる', () => {
      const user = User.create('user-1', 'test@example.com', 'Test User', 'テストユーザー', 'password123');

      expect(user.id).toBe('user-1');
      expect(user.email).toBe('test@example.com');
      expect(user.name).toBe('Test User');
      expect(user.displayName).toBe('テストユーザー');
      expect(user.password).toBe('password123');
      expect(user.createdAt).toBeInstanceOf(Date);
      expect(user.updatedAt).toBeInstanceOf(Date);
    });

    it('パスワードなしでユーザーを作成できる', () => {
      const user = User.create('user-1', 'test@example.com', 'Test User', 'テストユーザー');

      expect(user.password).toBeUndefined();
    });
  });

  describe('isEmailValid', () => {
    it('正しいメールアドレスの場合trueを返す', () => {
      const user = new User('1', 'test@example.com', 'Test', 'テスト');
      expect(user.isEmailValid()).toBe(true);
    });

    it('サブドメイン付きのメールアドレスでtrueを返す', () => {
      const user = new User('1', 'user@mail.example.co.jp', 'Test', 'テスト');
      expect(user.isEmailValid()).toBe(true);
    });

    it('@がない場合falseを返す', () => {
      const user = new User('1', 'invalid-email', 'Test', 'テスト');
      expect(user.isEmailValid()).toBe(false);
    });

    it('空文字の場合falseを返す', () => {
      const user = new User('1', '', 'Test', 'テスト');
      expect(user.isEmailValid()).toBe(false);
    });

    it('スペースが含まれる場合falseを返す', () => {
      const user = new User('1', 'test @example.com', 'Test', 'テスト');
      expect(user.isEmailValid()).toBe(false);
    });

    it('ドメインがない場合falseを返す', () => {
      const user = new User('1', 'test@', 'Test', 'テスト');
      expect(user.isEmailValid()).toBe(false);
    });
  });

  describe('hasPassword', () => {
    it('パスワードが設定されている場合trueを返す', () => {
      const user = new User('1', 'test@example.com', 'Test', 'テスト', 'password123');
      expect(user.hasPassword()).toBe(true);
    });

    it('パスワードが未設定の場合falseを返す', () => {
      const user = new User('1', 'test@example.com', 'Test', 'テスト');
      expect(user.hasPassword()).toBe(false);
    });

    it('パスワードが空文字の場合falseを返す', () => {
      const user = new User('1', 'test@example.com', 'Test', 'テスト', '');
      expect(user.hasPassword()).toBe(false);
    });
  });
});
