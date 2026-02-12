import { AuthRepository } from "@/infrastructures/auth-repository";
import { User } from "@/domains/user/user";
import { UserSession } from "@/domains/auth/user-session";
import prisma from "@/lib/prisma/prisma";

jest.mock('@/lib/prisma/prisma', () => ({
  __esModule: true,
  default: {
    users: {
      findUnique: jest.fn() as jest.Mock,
      create: jest.fn() as jest.Mock,
      update: jest.fn() as jest.Mock,
    },
    userSession: {
      create: jest.fn() as jest.Mock,
      findUnique: jest.fn() as jest.Mock,
      delete: jest.fn() as jest.Mock,
      deleteMany: jest.fn() as jest.Mock,
    },
  },
}));

describe('AuthRepository', () => {
  let repository: AuthRepository;
  const prismaMock = prisma as jest.Mocked<typeof prisma>;

  const mockUserDb = {
    id: 'user-1',
    name: 'テストユーザー',
    displayName: '表示名',
    email: 'test@example.com',
    costPerHour: 5000,
    password: 'hashed-password',
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
  };

  const mockSessionDb = {
    id: 'session-1',
    userId: 'user-1',
    token: 'test-token-123',
    expiresAt: new Date('2025-12-31'),
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
  };

  beforeEach(() => {
    repository = new AuthRepository();
    jest.clearAllMocks();
  });

  describe('findUserByEmail', () => {
    it('メールアドレスでユーザーを取得できること', async () => {
      (prismaMock.users.findUnique as jest.Mock).mockResolvedValue(mockUserDb);

      const user = await repository.findUserByEmail('test@example.com');

      expect(prismaMock.users.findUnique).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
      });
      expect(user).not.toBeNull();
      expect(user?.id).toBe('user-1');
      expect(user?.email).toBe('test@example.com');
      expect(user?.password).toBe('hashed-password');
    });

    it('存在しないメールアドレスの場合はnullを返すこと', async () => {
      (prismaMock.users.findUnique as jest.Mock).mockResolvedValue(null);

      const user = await repository.findUserByEmail('notfound@example.com');

      expect(user).toBeNull();
    });

    it('パスワードがnullの場合はundefinedとしてマッピングされること', async () => {
      (prismaMock.users.findUnique as jest.Mock).mockResolvedValue({
        ...mockUserDb,
        password: null,
      });

      const user = await repository.findUserByEmail('test@example.com');

      expect(user?.password).toBeUndefined();
    });
  });

  describe('findUserById', () => {
    it('IDでユーザーを取得できること', async () => {
      (prismaMock.users.findUnique as jest.Mock).mockResolvedValue(mockUserDb);

      const user = await repository.findUserById('user-1');

      expect(prismaMock.users.findUnique).toHaveBeenCalledWith({
        where: { id: 'user-1' },
      });
      expect(user?.id).toBe('user-1');
    });

    it('存在しないIDの場合はnullを返すこと', async () => {
      (prismaMock.users.findUnique as jest.Mock).mockResolvedValue(null);

      const user = await repository.findUserById('not-exist');

      expect(user).toBeNull();
    });
  });

  describe('createUser', () => {
    it('ユーザーを作成できること', async () => {
      (prismaMock.users.create as jest.Mock).mockResolvedValue(mockUserDb);

      const inputUser = User.createFromDb({
        id: 'user-1',
        name: 'テストユーザー',
        displayName: '表示名',
        email: 'test@example.com',
        costPerHour: 5000,
        password: 'hashed-password',
      });

      const created = await repository.createUser(inputUser);

      expect(prismaMock.users.create).toHaveBeenCalledWith({
        data: {
          id: 'user-1',
          email: 'test@example.com',
          name: 'テストユーザー',
          displayName: '表示名',
          password: 'hashed-password',
        },
      });
      expect(created.id).toBe('user-1');
    });
  });

  describe('updateUser', () => {
    it('ユーザーを更新できること', async () => {
      const mockUpdated = { ...mockUserDb, name: '更新後ユーザー' };
      (prismaMock.users.update as jest.Mock).mockResolvedValue(mockUpdated);

      const inputUser = User.createFromDb({
        id: 'user-1',
        name: '更新後ユーザー',
        displayName: '表示名',
        email: 'test@example.com',
        costPerHour: 5000,
        password: 'hashed-password',
      });

      const updated = await repository.updateUser(inputUser);

      expect(prismaMock.users.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: {
          email: 'test@example.com',
          name: '更新後ユーザー',
          displayName: '表示名',
          password: 'hashed-password',
        },
      });
      expect(updated.name).toBe('更新後ユーザー');
    });
  });

  describe('createSession', () => {
    it('セッションを作成できること', async () => {
      (prismaMock.userSession.create as jest.Mock).mockResolvedValue(mockSessionDb);

      const session = new UserSession(
        'session-1',
        'user-1',
        'test-token-123',
        new Date('2025-12-31'),
      );

      const created = await repository.createSession(session);

      expect(prismaMock.userSession.create).toHaveBeenCalledWith({
        data: {
          id: 'session-1',
          userId: 'user-1',
          token: 'test-token-123',
          expiresAt: new Date('2025-12-31'),
        },
      });
      expect(created.id).toBe('session-1');
      expect(created.token).toBe('test-token-123');
    });
  });

  describe('findSessionByToken', () => {
    it('トークンでセッションを取得できること', async () => {
      (prismaMock.userSession.findUnique as jest.Mock).mockResolvedValue(mockSessionDb);

      const session = await repository.findSessionByToken('test-token-123');

      expect(prismaMock.userSession.findUnique).toHaveBeenCalledWith({
        where: { token: 'test-token-123' },
      });
      expect(session).not.toBeNull();
      expect(session?.token).toBe('test-token-123');
      expect(session?.userId).toBe('user-1');
    });

    it('存在しないトークンの場合はnullを返すこと', async () => {
      (prismaMock.userSession.findUnique as jest.Mock).mockResolvedValue(null);

      const session = await repository.findSessionByToken('invalid-token');

      expect(session).toBeNull();
    });
  });

  describe('deleteSession', () => {
    it('セッションを削除できること', async () => {
      (prismaMock.userSession.delete as jest.Mock).mockResolvedValue({});

      await repository.deleteSession('session-1');

      expect(prismaMock.userSession.delete).toHaveBeenCalledWith({
        where: { id: 'session-1' },
      });
    });
  });

  describe('deleteExpiredSessions', () => {
    it('期限切れセッションを一括削除できること', async () => {
      (prismaMock.userSession.deleteMany as jest.Mock).mockResolvedValue({ count: 5 });

      await repository.deleteExpiredSessions();

      expect(prismaMock.userSession.deleteMany).toHaveBeenCalledWith({
        where: {
          expiresAt: {
            lt: expect.any(Date),
          },
        },
      });
    });
  });
});
