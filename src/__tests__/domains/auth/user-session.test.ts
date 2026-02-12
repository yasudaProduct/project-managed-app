import { UserSession } from '@/domains/auth/user-session';

// jsdom環境ではcrypto.randomUUIDが利用できないためモック
let uuidCounter = 0;
beforeAll(() => {
  if (!globalThis.crypto?.randomUUID) {
    Object.defineProperty(globalThis, 'crypto', {
      value: {
        ...globalThis.crypto,
        randomUUID: () => `00000000-0000-4000-8000-${String(++uuidCounter).padStart(12, '0')}`,
      },
    });
  }
});

describe('UserSession', () => {
  describe('create', () => {
    it('指定のuserIdとtokenでセッションを作成できる', () => {
      const token = 'test-token-123';
      const expiresAt = new Date('2026-03-01T00:00:00.000Z');
      const session = UserSession.create('user-1', token, expiresAt);

      expect(session.userId).toBe('user-1');
      expect(session.token).toBe(token);
      expect(session.expiresAt).toBe(expiresAt);
      expect(session.id).toBeDefined();
      expect(session.createdAt).toBeInstanceOf(Date);
      expect(session.updatedAt).toBeInstanceOf(Date);
    });
  });

  describe('isExpired', () => {
    it('有効期限が過去の場合trueを返す', () => {
      const pastDate = new Date('2020-01-01T00:00:00.000Z');
      const session = new UserSession('id-1', 'user-1', 'token', pastDate);

      expect(session.isExpired()).toBe(true);
    });

    it('有効期限が未来の場合falseを返す', () => {
      const futureDate = new Date('2099-12-31T23:59:59.000Z');
      const session = new UserSession('id-1', 'user-1', 'token', futureDate);

      expect(session.isExpired()).toBe(false);
    });
  });

  describe('isValid', () => {
    it('有効期限内の場合trueを返す', () => {
      const futureDate = new Date('2099-12-31T23:59:59.000Z');
      const session = new UserSession('id-1', 'user-1', 'token', futureDate);

      expect(session.isValid()).toBe(true);
    });

    it('有効期限切れの場合falseを返す', () => {
      const pastDate = new Date('2020-01-01T00:00:00.000Z');
      const session = new UserSession('id-1', 'user-1', 'token', pastDate);

      expect(session.isValid()).toBe(false);
    });
  });

  describe('generateToken', () => {
    it('文字列トークンを生成する', () => {
      const token = UserSession.generateToken();

      expect(typeof token).toBe('string');
      expect(token.length).toBeGreaterThan(0);
    });

    it('毎回異なるトークンを生成する', () => {
      const token1 = UserSession.generateToken();
      const token2 = UserSession.generateToken();

      expect(token1).not.toBe(token2);
    });

    it('ハイフン区切りのUUID部分とタイムスタンプ部分を含む', () => {
      const token = UserSession.generateToken();

      // UUID-timestamp形式 (例: "550e8400-e29b-41d4-a716-446655440000-m1abc2d")
      expect(token).toContain('-');
    });
  });

  describe('createExpirationDate', () => {
    it('デフォルトで30日後の日付を返す', () => {
      const before = new Date();
      const expirationDate = UserSession.createExpirationDate();
      const after = new Date();

      const expectedMin = new Date(before);
      expectedMin.setDate(expectedMin.getDate() + 30);

      const expectedMax = new Date(after);
      expectedMax.setDate(expectedMax.getDate() + 30);

      expect(expirationDate.getTime()).toBeGreaterThanOrEqual(expectedMin.getTime() - 1000);
      expect(expirationDate.getTime()).toBeLessThanOrEqual(expectedMax.getTime() + 1000);
    });

    it('指定日数後の日付を返す', () => {
      const before = new Date();
      const expirationDate = UserSession.createExpirationDate(7);

      const expected = new Date(before);
      expected.setDate(expected.getDate() + 7);

      expect(Math.abs(expirationDate.getTime() - expected.getTime())).toBeLessThan(1000);
    });
  });
});
