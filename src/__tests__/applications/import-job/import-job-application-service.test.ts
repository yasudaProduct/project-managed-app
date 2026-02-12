import { ImportJobApplicationService } from '@/applications/import-job/import-job-application.service';
import { ImportJob } from '@/domains/import-job/import-job';
import { ImportJobStatuses } from '@/domains/import-job/import-job-enums';
import type { IImportJobRepository } from '@/applications/import-job/iimport-job.repository';
import 'reflect-metadata';

describe('ImportJobApplicationService', () => {
  let service: ImportJobApplicationService;
  let mockRepository: jest.Mocked<IImportJobRepository>;

  const createMockJob = (status: string = 'PENDING'): ImportJob => {
    return new ImportJob(
      'job-1', 'WBS', status as any, 'user-1',
      new Date(), new Date(),
      '2026-01', [], undefined, {},
      100, 0, 0, 0,
    );
  };

  beforeEach(() => {
    mockRepository = {
      create: jest.fn(),
      update: jest.fn(),
      findById: jest.fn(),
      findAll: jest.fn(),
      findByUser: jest.fn(),
      findByStatus: jest.fn(),
      findByTypeAndStatus: jest.fn(),
      addProgress: jest.fn(),
      getProgress: jest.fn(),
    };
    service = new ImportJobApplicationService(mockRepository);
  });

  describe('createJob', () => {
    it('ジョブを作成してリポジトリに保存する', async () => {
      const createdJob = createMockJob();
      mockRepository.create.mockResolvedValue(createdJob);

      const result = await service.createJob({
        type: 'WBS',
        options: {},
        createdBy: 'user-1',
      });

      expect(mockRepository.create).toHaveBeenCalled();
      expect(result).toBe(createdJob);
    });
  });

  describe('startJob', () => {
    it('PENDINGジョブを開始する', async () => {
      const job = createMockJob('PENDING');
      mockRepository.findById.mockResolvedValue(job);
      mockRepository.update.mockResolvedValue(job);
      mockRepository.addProgress.mockResolvedValue();

      await service.startJob('job-1');

      expect(mockRepository.update).toHaveBeenCalled();
      expect(mockRepository.addProgress).toHaveBeenCalled();
    });

    it('ジョブが見つからない場合エラーを投げる', async () => {
      mockRepository.findById.mockResolvedValue(null);

      await expect(service.startJob('nonexistent')).rejects.toThrow('ジョブが見つかりません');
    });
  });

  describe('updateJobProgress', () => {
    it('RUNNINGジョブの進捗を更新する', async () => {
      const job = createMockJob('RUNNING');
      mockRepository.findById.mockResolvedValue(job);
      mockRepository.update.mockResolvedValue(job);

      await service.updateJobProgress('job-1', 50, 45, 5);

      expect(mockRepository.update).toHaveBeenCalled();
    });

    it('ジョブが見つからない場合エラーを投げる', async () => {
      mockRepository.findById.mockResolvedValue(null);

      await expect(service.updateJobProgress('nonexistent', 10, 10, 0))
        .rejects.toThrow('ジョブが見つかりません');
    });
  });

  describe('completeJob', () => {
    it('RUNNINGジョブを完了する', async () => {
      const job = createMockJob('RUNNING');
      mockRepository.findById.mockResolvedValue(job);
      mockRepository.update.mockResolvedValue(job);
      mockRepository.addProgress.mockResolvedValue();

      await service.completeJob('job-1', { summary: 'done' });

      expect(mockRepository.update).toHaveBeenCalled();
      expect(mockRepository.addProgress).toHaveBeenCalled();
    });
  });

  describe('failJob', () => {
    it('ジョブを失敗にする', async () => {
      const job = createMockJob('RUNNING');
      mockRepository.findById.mockResolvedValue(job);
      mockRepository.update.mockResolvedValue(job);
      mockRepository.addProgress.mockResolvedValue();

      await service.failJob('job-1', { error: 'timeout' });

      expect(mockRepository.update).toHaveBeenCalled();
    });
  });

  describe('cancelJob', () => {
    it('PENDINGジョブをキャンセルする', async () => {
      const job = createMockJob('PENDING');
      mockRepository.findById.mockResolvedValue(job);
      mockRepository.update.mockResolvedValue(job);
      mockRepository.addProgress.mockResolvedValue();

      await service.cancelJob('job-1');

      expect(mockRepository.update).toHaveBeenCalled();
    });
  });

  describe('getJob', () => {
    it('ジョブを取得する', async () => {
      const job = createMockJob();
      mockRepository.findById.mockResolvedValue(job);

      const result = await service.getJob('job-1');

      expect(result).toBe(job);
    });

    it('存在しない場合nullを返す', async () => {
      mockRepository.findById.mockResolvedValue(null);

      const result = await service.getJob('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('getAllJobs', () => {
    it('デフォルトでlimit 100で取得する', async () => {
      mockRepository.findAll.mockResolvedValue([]);

      await service.getAllJobs();

      expect(mockRepository.findAll).toHaveBeenCalledWith(100);
    });

    it('指定されたlimitで取得する', async () => {
      mockRepository.findAll.mockResolvedValue([]);

      await service.getAllJobs(50);

      expect(mockRepository.findAll).toHaveBeenCalledWith(50);
    });
  });

  describe('getUserJobs', () => {
    it('ユーザーのジョブを取得する', async () => {
      mockRepository.findByUser.mockResolvedValue([]);

      await service.getUserJobs('user-1');

      expect(mockRepository.findByUser).toHaveBeenCalledWith('user-1');
    });
  });

  describe('getPendingJobs', () => {
    it('PENDINGステータスで検索する', async () => {
      mockRepository.findByStatus.mockResolvedValue([]);

      await service.getPendingJobs();

      expect(mockRepository.findByStatus).toHaveBeenCalledWith(ImportJobStatuses.PENDING);
    });
  });

  describe('getRunningJobs', () => {
    it('RUNNINGステータスで検索する', async () => {
      mockRepository.findByStatus.mockResolvedValue([]);

      await service.getRunningJobs();

      expect(mockRepository.findByStatus).toHaveBeenCalledWith(ImportJobStatuses.RUNNING);
    });
  });

  describe('getJobProgress', () => {
    it('ジョブの進捗ログを取得する', async () => {
      mockRepository.getProgress.mockResolvedValue([]);

      await service.getJobProgress('job-1');

      expect(mockRepository.getProgress).toHaveBeenCalledWith('job-1');
    });
  });
});
