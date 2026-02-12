import { AuthService } from '@/domains/auth/auth-service';
import { User } from '@/domains/user/user';
import { UserSession } from '@/domains/auth/user-session';
import type { IAuthRepository } from '@/applications/auth/iauth-repository';

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

describe('AuthService', () => {
  let authService: AuthService;
  let mockRepository: jest.Mocked<IAuthRepository>;

  const createUser = (id: string, password?: string) =>
    User.createFromDb({
      id,
      email: 'test@example.com',
      name: 'Test',
      displayName: 'テスト',
      costPerHour: 5000,
      password,
    });

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
    authService = new AuthService(mockRepository);
  });

  describe('login', () => {
    it('メールアドレスでユーザーを見つけてセッションを作成する', async () => {
      const user = createUser('user-1');
      mockRepository.findUserByEmail.mockResolvedValue(user);
      mockRepository.createSession.mockImplementation(async (session) => session);

      const result = await authService.login('test@example.com');

      expect(result).not.toBeNull();
      expect(result!.user).toBe(user);
      expect(result!.session).toBeInstanceOf(UserSession);
      expect(mockRepository.createSession).toHaveBeenCalled();
    });

    it('ユーザーが見つからない場合nullを返す', async () => {
      mockRepository.findUserByEmail.mockResolvedValue(null);

      const result = await authService.login('nonexistent@example.com');

      expect(result).toBeNull();
      expect(mockRepository.createSession).not.toHaveBeenCalled();
    });

    it('パスワードが一致しない場合nullを返す', async () => {
      const user = createUser('user-1', 'correct-password');
      mockRepository.findUserByEmail.mockResolvedValue(user);

      const result = await authService.login('test@example.com', 'wrong-password');

      expect(result).toBeNull();
      expect(mockRepository.createSession).not.toHaveBeenCalled();
    });

    it('パスワードが一致する場合セッションを作成する', async () => {
      const user = createUser('user-1', 'correct-password');
      mockRepository.findUserByEmail.mockResolvedValue(user);
      mockRepository.createSession.mockImplementation(async (session) => session);

      const result = await authService.login('test@example.com', 'correct-password');

      expect(result).not.toBeNull();
      expect(result!.user.id).toBe('user-1');
    });

    it('パスワード未設定のユーザーはパスワードなしでログインできる', async () => {
      const user = createUser('user-1');
      mockRepository.findUserByEmail.mockResolvedValue(user);
      mockRepository.createSession.mockImplementation(async (session) => session);

      const result = await authService.login('test@example.com');

      expect(result).not.toBeNull();
    });
  });

  describe('logout', () => {
    it('セッションが存在する場合trueを返し削除する', async () => {
      const session = new UserSession('session-1', 'user-1', 'token-123', new Date('2099-01-01'));
      mockRepository.findSessionByToken.mockResolvedValue(session);
      mockRepository.deleteSession.mockResolvedValue();

      const result = await authService.logout('token-123');

      expect(result).toBe(true);
      expect(mockRepository.deleteSession).toHaveBeenCalledWith('session-1');
    });

    it('セッションが見つからない場合falseを返す', async () => {
      mockRepository.findSessionByToken.mockResolvedValue(null);

      const result = await authService.logout('nonexistent-token');

      expect(result).toBe(false);
      expect(mockRepository.deleteSession).not.toHaveBeenCalled();
    });
  });

  describe('validateSession', () => {
    it('有効なセッションの場合ユーザーを返す', async () => {
      const session = new UserSession('session-1', 'user-1', 'valid-token', new Date('2099-01-01'));
      const user = createUser('user-1');
      mockRepository.findSessionByToken.mockResolvedValue(session);
      mockRepository.findUserById.mockResolvedValue(user);

      const result = await authService.validateSession('valid-token');

      expect(result).toBe(user);
    });

    it('セッションが見つからない場合nullを返す', async () => {
      mockRepository.findSessionByToken.mockResolvedValue(null);

      const result = await authService.validateSession('nonexistent-token');

      expect(result).toBeNull();
    });

    it('期限切れセッションの場合nullを返す', async () => {
      const session = new UserSession('session-1', 'user-1', 'expired-token', new Date('2020-01-01'));
      mockRepository.findSessionByToken.mockResolvedValue(session);

      const result = await authService.validateSession('expired-token');

      expect(result).toBeNull();
      expect(mockRepository.findUserById).not.toHaveBeenCalled();
    });
  });

  describe('cleanupExpiredSessions', () => {
    it('リポジトリのdeleteExpiredSessionsを呼び出す', async () => {
      mockRepository.deleteExpiredSessions.mockResolvedValue();

      await authService.cleanupExpiredSessions();

      expect(mockRepository.deleteExpiredSessions).toHaveBeenCalledTimes(1);
    });
  });
});
