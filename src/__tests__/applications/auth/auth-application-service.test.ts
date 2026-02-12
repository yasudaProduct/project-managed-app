import { AuthApplicationService } from '@/applications/auth/auth-application-service';
import { User } from '@/domains/user/user';
import { UserSession } from '@/domains/auth/user-session';
import type { IAuthRepository } from '@/applications/auth/iauth-repository';
import 'reflect-metadata';

beforeAll(() => {
  if (!globalThis.crypto?.randomUUID) {
    Object.defineProperty(globalThis, 'crypto', {
      value: {
        ...globalThis.crypto,
        randomUUID: () => '00000000-0000-4000-8000-000000000000',
      },
    });
  }
});

describe('AuthApplicationService', () => {
  let service: AuthApplicationService;
  let mockRepository: jest.Mocked<IAuthRepository>;

  beforeEach(() => {
    mockRepository = {
      findUserByEmail: jest.fn(),
      findUserById: jest.fn(),
      createUser: jest.fn(),
      updateUser: jest.fn(),
      createSession: jest.fn(),
      findSessionByToken: jest.fn(),
      deleteSession: jest.fn(),
      deleteExpiredSessions: jest.fn(),
    };
    service = new AuthApplicationService(mockRepository);
  });

  describe('login', () => {
    it('成功時にsuccess: trueとuser, sessionを返す', async () => {
      const user = User.createFromDb({ id: 'user-1', email: 'test@example.com', name: 'Test', displayName: 'テスト', costPerHour: 5000 });
      mockRepository.findUserByEmail.mockResolvedValue(user);
      mockRepository.createSession.mockImplementation(async (session) => session);

      const result = await service.login({ email: 'test@example.com' });

      expect(result.success).toBe(true);
      expect(result.user).toBeDefined();
      expect(result.session).toBeDefined();
    });

    it('ユーザーが見つからない場合エラーメッセージを返す', async () => {
      mockRepository.findUserByEmail.mockResolvedValue(null);

      const result = await service.login({ email: 'unknown@example.com' });

      expect(result.success).toBe(false);
      expect(result.error).toBe('メールアドレスまたはパスワードが正しくありません');
    });

    it('例外発生時にエラーメッセージを返す', async () => {
      mockRepository.findUserByEmail.mockRejectedValue(new Error('DB接続エラー'));

      const result = await service.login({ email: 'test@example.com' });

      expect(result.success).toBe(false);
      expect(result.error).toBe('DB接続エラー');
    });
  });

  describe('logout', () => {
    it('成功時にsuccess: trueを返す', async () => {
      const session = new UserSession('s1', 'u1', 'token', new Date('2099-01-01'));
      mockRepository.findSessionByToken.mockResolvedValue(session);
      mockRepository.deleteSession.mockResolvedValue();

      const result = await service.logout('token');

      expect(result.success).toBe(true);
    });

    it('セッションが見つからない場合success: falseを返す', async () => {
      mockRepository.findSessionByToken.mockResolvedValue(null);

      const result = await service.logout('invalid-token');

      expect(result.success).toBe(false);
    });

    it('例外発生時にsuccess: falseを返す', async () => {
      mockRepository.findSessionByToken.mockRejectedValue(new Error('DB error'));

      const result = await service.logout('token');

      expect(result.success).toBe(false);
    });
  });

  describe('validateSession', () => {
    it('有効なセッションの場合ユーザーを返す', async () => {
      const session = new UserSession('s1', 'u1', 'token', new Date('2099-01-01'));
      const user = User.createFromDb({ id: 'u1', email: 'test@example.com', name: 'Test', displayName: 'テスト', costPerHour: 5000 });
      mockRepository.findSessionByToken.mockResolvedValue(session);
      mockRepository.findUserById.mockResolvedValue(user);

      const result = await service.validateSession('token');

      expect(result).toBeDefined();
      expect(result!.id).toBe('u1');
    });

    it('例外発生時にnullを返す', async () => {
      mockRepository.findSessionByToken.mockRejectedValue(new Error());

      const result = await service.validateSession('token');

      expect(result).toBeNull();
    });
  });

  describe('getCurrentUser', () => {
    it('トークンがない場合nullを返す', async () => {
      const result = await service.getCurrentUser();

      expect(result).toBeNull();
    });

    it('トークンがある場合validateSessionを呼ぶ', async () => {
      const session = new UserSession('s1', 'u1', 'token', new Date('2099-01-01'));
      const user = User.createFromDb({ id: 'u1', email: 'test@example.com', name: 'Test', displayName: 'テスト', costPerHour: 5000 });
      mockRepository.findSessionByToken.mockResolvedValue(session);
      mockRepository.findUserById.mockResolvedValue(user);

      const result = await service.getCurrentUser('token');

      expect(result).toBeDefined();
    });
  });

  describe('cleanupExpiredSessions', () => {
    it('リポジトリのdeleteExpiredSessionsを呼び出す', async () => {
      mockRepository.deleteExpiredSessions.mockResolvedValue();

      await service.cleanupExpiredSessions();

      expect(mockRepository.deleteExpiredSessions).toHaveBeenCalledTimes(1);
    });
  });
});
