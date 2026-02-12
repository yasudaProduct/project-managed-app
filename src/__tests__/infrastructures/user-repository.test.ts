import { UserRepository } from "@/infrastructures/user-repository";
import { User } from "@/domains/user/user";
import prisma from "@/lib/prisma/prisma";

jest.mock('@/lib/prisma/prisma', () => ({
  __esModule: true,
  default: {
    users: {
      findMany: jest.fn() as jest.Mock,
      findUnique: jest.fn() as jest.Mock,
      create: jest.fn() as jest.Mock,
      update: jest.fn() as jest.Mock,
    },
  },
}));

describe('UserRepository', () => {
  let repository: UserRepository;
  const prismaMock = prisma as jest.Mocked<typeof prisma>;

  const mockUserDb = {
    id: 'user-1',
    name: 'テストユーザー',
    displayName: '表示名',
    email: 'test@example.com',
    costPerHour: 5000,
    password: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    repository = new UserRepository();
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('すべてのユーザーを取得できること', async () => {
      const mockUsers = [mockUserDb, { ...mockUserDb, id: 'user-2', name: 'ユーザー2' }];
      (prismaMock.users.findMany as jest.Mock).mockResolvedValue(mockUsers);

      const users = await repository.findAll();

      expect(prismaMock.users.findMany).toHaveBeenCalled();
      expect(users).toHaveLength(2);
      expect(users[0].id).toBe('user-1');
      expect(users[1].id).toBe('user-2');
    });

    it('ユーザーが存在しない場合は空配列を返すこと', async () => {
      (prismaMock.users.findMany as jest.Mock).mockResolvedValue([]);

      const users = await repository.findAll();

      expect(users).toEqual([]);
    });
  });

  describe('findByWbsDisplayName', () => {
    it('表示名でユーザーを検索できること', async () => {
      (prismaMock.users.findMany as jest.Mock).mockResolvedValue([mockUserDb]);

      const users = await repository.findByWbsDisplayName('表示名');

      expect(prismaMock.users.findMany).toHaveBeenCalledWith({
        where: { displayName: '表示名' },
      });
      expect(users).toHaveLength(1);
      expect(users[0].displayName).toBe('表示名');
    });

    it('該当ユーザーがいない場合は空配列を返すこと', async () => {
      (prismaMock.users.findMany as jest.Mock).mockResolvedValue([]);

      const users = await repository.findByWbsDisplayName('存在しない名前');

      expect(users).toEqual([]);
    });
  });

  describe('findById', () => {
    it('IDでユーザーを取得できること', async () => {
      (prismaMock.users.findUnique as jest.Mock).mockResolvedValue(mockUserDb);

      const user = await repository.findById('user-1');

      expect(prismaMock.users.findUnique).toHaveBeenCalledWith({
        where: { id: 'user-1' },
      });
      expect(user).not.toBeNull();
      expect(user?.id).toBe('user-1');
      expect(user?.name).toBe('テストユーザー');
      expect(user?.email).toBe('test@example.com');
      expect(user?.costPerHour).toBe(5000);
    });

    it('存在しないIDの場合はnullを返すこと', async () => {
      (prismaMock.users.findUnique as jest.Mock).mockResolvedValue(null);

      const user = await repository.findById('not-exist');

      expect(user).toBeNull();
    });
  });

  describe('create', () => {
    it('ユーザーを新規作成できること', async () => {
      const mockCreated = { ...mockUserDb, id: 'user-new' };
      (prismaMock.users.create as jest.Mock).mockResolvedValue(mockCreated);

      const user = await repository.create({
        id: 'user-new',
        name: 'テストユーザー',
        email: 'test@example.com',
        displayName: '表示名',
        costPerHour: 5000,
      });

      expect(prismaMock.users.create).toHaveBeenCalledWith({
        data: {
          id: 'user-new',
          name: 'テストユーザー',
          displayName: '表示名',
          email: 'test@example.com',
          costPerHour: 5000,
        },
      });
      expect(user.id).toBe('user-new');
    });
  });

  describe('update', () => {
    it('ユーザー情報を更新できること', async () => {
      const mockUpdated = { ...mockUserDb, name: '更新後の名前' };
      (prismaMock.users.update as jest.Mock).mockResolvedValue(mockUpdated);

      const user = await repository.update('user-1', {
        name: '更新後の名前',
        email: 'test@example.com',
        displayName: '表示名',
        costPerHour: 6000,
      });

      expect(prismaMock.users.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: {
          name: '更新後の名前',
          displayName: '表示名',
          email: 'test@example.com',
          costPerHour: 6000,
        },
      });
      expect(user.name).toBe('更新後の名前');
    });
  });
});
