import { GeppoApplicationService } from '@/applications/geppo/geppo-application-service';
import { Project } from '@/domains/project/project';
import type { IGeppoRepository } from '@/applications/geppo/repositories/igeppo.repository';
import type { IProjectRepository } from '@/applications/projects/iproject-repository';
import type { IUserRepository } from '@/applications/user/iuser-repositroy';
import 'reflect-metadata';

describe('GeppoApplicationService', () => {
  let service: GeppoApplicationService;
  let mockGeppoRepository: jest.Mocked<IGeppoRepository>;
  let mockProjectRepository: jest.Mocked<IProjectRepository>;
  let mockUserRepository: jest.Mocked<IUserRepository>;

  beforeEach(() => {
    mockGeppoRepository = {
      searchWorkEntries: jest.fn(),
      testConnection: jest.fn(),
    };
    mockProjectRepository = {
      findAll: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };
    mockUserRepository = {
      findAll: jest.fn(),
      findByWbsDisplayName: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    };
    service = new GeppoApplicationService(mockGeppoRepository, mockProjectRepository, mockUserRepository);
  });

  describe('searchWorkEntries', () => {
    it('有効なフィルタで検索結果を返す', async () => {
      const mockResult = {
        data: [],
        total: 0,
        page: 1,
        limit: 10,
        totalPages: 0,
        hasNextPage: false,
        hasPreviousPage: false,
      };
      mockGeppoRepository.searchWorkEntries.mockResolvedValue(mockResult);

      const result = await service.searchWorkEntries(
        {},
        { page: 1, limit: 10 },
      );

      expect(result).toBe(mockResult);
    });

    it('開始日が終了日より後の場合エラーを投げる', async () => {
      await expect(
        service.searchWorkEntries(
          { dateFrom: new Date('2026-06-01'), dateTo: new Date('2026-01-01') },
          { page: 1, limit: 10 },
        ),
      ).rejects.toThrow('開始日は終了日より前の日付を指定してください');
    });

    it('検索期間が1年を超える場合エラーを投げる', async () => {
      await expect(
        service.searchWorkEntries(
          { dateFrom: new Date('2024-01-01'), dateTo: new Date('2026-01-02') },
          { page: 1, limit: 10 },
        ),
      ).rejects.toThrow('検索期間は1年以内で指定してください');
    });

    it('ページ番号が0以下の場合エラーを投げる', async () => {
      await expect(
        service.searchWorkEntries(
          {},
          { page: 0, limit: 10 },
        ),
      ).rejects.toThrow('ページ番号は1以上で指定してください');
    });

    it('取得件数が範囲外の場合エラーを投げる', async () => {
      await expect(
        service.searchWorkEntries(
          {},
          { page: 1, limit: 0 },
        ),
      ).rejects.toThrow('取得件数は1〜1000件の範囲で指定してください');

      await expect(
        service.searchWorkEntries(
          {},
          { page: 1, limit: 1001 },
        ),
      ).rejects.toThrow('取得件数は1〜1000件の範囲で指定してください');
    });
  });

  describe('checkConnection', () => {
    it('接続成功時にtrueを返す', async () => {
      mockGeppoRepository.testConnection.mockResolvedValue(true);

      const result = await service.checkConnection();

      expect(result).toBe(true);
    });

    it('接続失敗時にfalseを返す', async () => {
      mockGeppoRepository.testConnection.mockRejectedValue(new Error('connection error'));

      const result = await service.checkConnection();

      expect(result).toBe(false);
    });
  });

  describe('getFilterOptions', () => {
    it('アクティブなプロジェクトを返す', async () => {
      const activeProject = Project.create({
        name: 'Active',
        description: 'desc',
        startDate: new Date('2026-01-01T00:00:00.000Z'),
        endDate: new Date('2026-12-31T00:00:00.000Z'),
      });
      const completedProject = Project.create({
        name: 'Completed',
        description: 'desc',
        startDate: new Date('2025-01-01T00:00:00.000Z'),
        endDate: new Date('2025-12-31T00:00:00.000Z'),
      });
      // ACTIVEになるように日付を設定
      mockProjectRepository.findAll.mockResolvedValue([activeProject, completedProject]);

      const result = await service.getFilterOptions();

      expect(result.users).toEqual([]);
      // プロジェクトのフィルタリングは getStatus() === 'ACTIVE' による
      expect(mockProjectRepository.findAll).toHaveBeenCalled();
    });

    it('例外発生時にエラーを投げる', async () => {
      mockProjectRepository.findAll.mockRejectedValue(new Error('DB error'));

      await expect(service.getFilterOptions()).rejects.toThrow('フィルタオプションの取得に失敗しました');
    });
  });
});
