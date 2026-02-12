import { UserApplicationService } from '@/applications/user/user-application-service';
import { User } from '@/domains/user/user';
import type { IUserRepository } from '@/applications/user/iuser-repositroy';
import 'reflect-metadata';

describe('UserApplicationService', () => {
  let service: UserApplicationService;
  let mockRepository: jest.Mocked<IUserRepository>;

  const createDomainUser = (id: string, name: string = `User ${id}`) =>
    User.createFromDb({
      id,
      name,
      displayName: `ユーザー${id}`,
      email: `${id}@test.com`,
      costPerHour: 5000,
    });

  beforeEach(() => {
    mockRepository = {
      findAll: jest.fn(),
      findByWbsDisplayName: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    };
    service = new UserApplicationService(mockRepository);
  });

  describe('getAllUsers', () => {
    it('全ユーザーをDTO形式で返す', async () => {
      const users = [
        createDomainUser('u1', 'User1'),
        createDomainUser('u2', 'User2'),
      ];
      mockRepository.findAll.mockResolvedValue(users);

      const result = await service.getAllUsers();

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('u1');
      expect(result[0].name).toBe('User1');
    });
  });

  describe('getUserById', () => {
    it('ユーザーが存在する場合DTOを返す', async () => {
      const user = createDomainUser('u1');
      mockRepository.findById.mockResolvedValue(user);

      const result = await service.getUserById('u1');

      expect(result).not.toBeNull();
      expect(result!.id).toBe('u1');
    });

    it('ユーザーが存在しない場合nullを返す', async () => {
      mockRepository.findById.mockResolvedValue(null);

      const result = await service.getUserById('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('createUser', () => {
    it('成功時にsuccess: trueとuserを返す', async () => {
      const user = createDomainUser('u1');
      mockRepository.create.mockResolvedValue(user);

      const result = await service.createUser({
        id: 'u1',
        name: 'User u1',
        email: 'u1@test.com',
        displayName: 'ユーザーu1',
        costPerHour: 5000,
      });

      expect(result.success).toBe(true);
      expect(result.user).toBeDefined();
    });

    it('例外発生時にエラーメッセージを返す', async () => {
      mockRepository.create.mockRejectedValue(new Error('重複エラー'));

      const result = await service.createUser({
        id: 'u1',
        name: 'User1',
        email: 'u1@test.com',
        displayName: 'ユーザー1',
        costPerHour: 5000,
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('重複エラー');
    });
  });

  describe('updateUser', () => {
    it('成功時にsuccess: trueと更新されたuserを返す', async () => {
      const existingUser = createDomainUser('u1', 'OldName');
      const updatedUser = User.createFromDb({
        id: 'u1',
        name: 'NewName',
        displayName: '新名前',
        email: 'new@test.com',
        costPerHour: 6000,
      });
      mockRepository.findById.mockResolvedValue(existingUser);
      mockRepository.update.mockResolvedValue(updatedUser);

      const result = await service.updateUser('u1', {
        name: 'NewName',
        email: 'new@test.com',
        displayName: '新名前',
        costPerHour: 6000,
      });

      expect(result.success).toBe(true);
      expect(result.user!.name).toBe('NewName');
    });

    it('ユーザーが存在しない場合エラーを返す', async () => {
      mockRepository.findById.mockResolvedValue(null);

      const result = await service.updateUser('nonexistent', {
        name: 'Test',
        email: 'test@test.com',
        displayName: 'テスト',
        costPerHour: 5000,
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('ユーザーが見つかりません');
    });

    it('例外発生時にエラーメッセージを返す', async () => {
      const existingUser = createDomainUser('u1');
      mockRepository.findById.mockResolvedValue(existingUser);
      mockRepository.update.mockRejectedValue(new Error('DB更新エラー'));

      const result = await service.updateUser('u1', {
        name: 'Test',
        email: 'test@test.com',
        displayName: 'テスト',
        costPerHour: 5000,
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('DB更新エラー');
    });
  });
});
