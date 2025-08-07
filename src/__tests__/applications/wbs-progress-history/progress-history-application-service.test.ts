import 'reflect-metadata';
import { ProgressHistoryApplicationService } from '../../../applications/wbs-progress-history/progress-history-application-service';
import { IProgressHistoryRepository } from '../../../applications/wbs-progress-history/iprogress-history-repository';
import { IWbsRepository } from '../../../applications/wbs/iwbs-repository';
import { ITaskRepository } from '../../../applications/task/itask-repository';
import { WbsProgressHistory, RecordType } from '../../../domains/wbs-progress-history';
import { Wbs } from '../../../domains/wbs/wbs';

// モックの作成
const mockProgressHistoryRepository: jest.Mocked<IProgressHistoryRepository> = {
  save: jest.fn(),
  findById: jest.fn(),
  findByWbsAndDate: jest.fn(),
  findByWbs: jest.fn(),
  countByWbs: jest.fn(),
  deleteOldHistories: jest.fn(),
  delete: jest.fn(),
};

const mockWbsRepository: jest.Mocked<IWbsRepository> = {
  findById: jest.fn(),
  findByProjectId: jest.fn(),
  save: jest.fn(),
  delete: jest.fn(),
  exists: jest.fn(),
};

const mockTaskRepository: jest.Mocked<ITaskRepository> = {
  findByWbsId: jest.fn(),
  findById: jest.fn(),
  save: jest.fn(),
  delete: jest.fn(),
};

// 簡単なモックタスクを作成するヘルパー
const createMockTask = (id: number, status: string) => ({
  id,
  taskNo: `T1-000${id}`,
  name: `テストタスク${id}`,
  status: { toString: () => status },
  assignee: { id: 1, name: '田中太郎' },
  phaseId: 1,
  phaseName: '設計',
  periods: [
    {
      type: { toString: () => 'YOTEI' },
      startDate: new Date('2024-01-01'),
      endDate: new Date('2024-01-10'),
      kosus: [{ kosu: { toNumber: () => 40 } }],
    },
    {
      type: { toString: () => 'JISSEKI' },
      startDate: new Date('2024-01-01'),
      endDate: new Date('2024-01-08'),
      kosus: [{ kosu: { toNumber: () => 32 } }],
    },
  ],
});

describe('ProgressHistoryApplicationService', () => {
  let service: ProgressHistoryApplicationService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ProgressHistoryApplicationService(
      mockProgressHistoryRepository,
      mockWbsRepository,
      mockTaskRepository
    );
  });

  describe('recordTaskUpdate', () => {
    it('タスク更新時に自動進捗記録を作成する', async () => {
      // Arrange
      const wbsId = 1;
      
      const mockWbs = { id: wbsId } as Wbs;
      mockWbsRepository.findById.mockResolvedValue(mockWbs);

      const mockTasks = [createMockTask(1, 'COMPLETED')];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mockTaskRepository.findByWbsId.mockResolvedValue(mockTasks as any);

      const savedHistory = WbsProgressHistory.createAutoRecord(
        wbsId, 1, 1, 0, 0, 100, 40, 32, -8
      );
      mockProgressHistoryRepository.save.mockResolvedValue(savedHistory);

      // Act
      const result = await service.recordTaskUpdate(wbsId);

      // Assert
      expect(mockWbsRepository.findById).toHaveBeenCalledWith(wbsId);
      expect(mockTaskRepository.findByWbsId).toHaveBeenCalledWith(wbsId);
      expect(mockProgressHistoryRepository.save).toHaveBeenCalled();
      expect(result.recordType).toBe(RecordType.AUTO);
      expect(result.totalTaskCount).toBe(1);
    });

    it('WBSが見つからない場合はエラーを投げる', async () => {
      // Arrange
      mockWbsRepository.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(service.recordTaskUpdate(1)).rejects.toThrow('WBSが見つかりません');
    });
  });

  describe('createSnapshot', () => {
    it('手動スナップショットを作成する', async () => {
      // Arrange
      const wbsId = 1;
      const snapshotName = 'テストスナップショット';
      
      const mockWbs = { id: wbsId } as Wbs;
      mockWbsRepository.findById.mockResolvedValue(mockWbs);

      const mockTasks = [createMockTask(1, 'IN_PROGRESS')];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mockTaskRepository.findByWbsId.mockResolvedValue(mockTasks as any);

      const savedHistory = WbsProgressHistory.createManualSnapshot(
        wbsId, snapshotName, 1, 0, 1, 0, 0, 40, 0, -40
      );
      mockProgressHistoryRepository.save.mockResolvedValue(savedHistory);

      // Act
      const result = await service.createSnapshot(wbsId, snapshotName);

      // Assert
      expect(mockWbsRepository.findById).toHaveBeenCalledWith(wbsId);
      expect(mockTaskRepository.findByWbsId).toHaveBeenCalledWith(wbsId);
      expect(mockProgressHistoryRepository.save).toHaveBeenCalled();
      expect(result.recordType).toBe(RecordType.MANUAL_SNAPSHOT);
      expect(result.snapshotName).toBe(snapshotName);
    });

    it('スナップショット名が指定されない場合はデフォルト名を使用する', async () => {
      // Arrange
      const wbsId = 1;
      
      const mockWbs = { id: wbsId } as Wbs;
      mockWbsRepository.findById.mockResolvedValue(mockWbs);
      mockTaskRepository.findByWbsId.mockResolvedValue([]);

      // mockProgressHistoryRepository.save をモックして、呼び出された引数をキャプチャ
      mockProgressHistoryRepository.save.mockImplementation(async (history) => {
        // スナップショット名にデフォルト名が設定されているかチェック
        expect(history.snapshotName).toContain('手動スナップショット_');
        return history;
      });

      // Act
      await service.createSnapshot(wbsId);

      // Assert
      expect(mockProgressHistoryRepository.save).toHaveBeenCalled();
    });
  });

  describe('getProgressAtDate', () => {
    it('指定日時の進捗を取得する', async () => {
      // Arrange
      const wbsId = 1;
      const targetDate = new Date('2024-01-15');
      const expectedHistory = WbsProgressHistory.createAutoRecord(
        wbsId, 1, 1, 0, 0, 100, 40, 32, -8
      );
      mockProgressHistoryRepository.findByWbsAndDate.mockResolvedValue(expectedHistory);

      // Act
      const result = await service.getProgressAtDate(wbsId, targetDate);

      // Assert
      expect(mockProgressHistoryRepository.findByWbsAndDate).toHaveBeenCalledWith(wbsId, targetDate);
      expect(result).toBe(expectedHistory);
    });
  });

  describe('deleteOldData', () => {
    it('古いデータを削除する', async () => {
      // Arrange
      const wbsId = 1;
      const beforeDate = new Date('2023-12-31');
      
      const mockWbs = { id: wbsId } as Wbs;
      mockWbsRepository.findById.mockResolvedValue(mockWbs);
      mockProgressHistoryRepository.deleteOldHistories.mockResolvedValue(5);

      // Act
      const result = await service.deleteOldData(wbsId, beforeDate);

      // Assert
      expect(mockWbsRepository.findById).toHaveBeenCalledWith(wbsId);
      expect(mockProgressHistoryRepository.deleteOldHistories).toHaveBeenCalledWith(wbsId, beforeDate);
      expect(result).toBe(5);
    });

    it('WBSが見つからない場合はエラーを投げる', async () => {
      // Arrange
      mockWbsRepository.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(service.deleteOldData(1, new Date())).rejects.toThrow('WBSが見つかりません');
    });
  });

  describe('deleteProgressHistory', () => {
    it('進捗履歴を削除する', async () => {
      // Arrange
      const historyId = 1;
      const mockHistory = WbsProgressHistory.createAutoRecord(1, 1, 1, 0, 0, 100, 40, 32, -8);
      mockProgressHistoryRepository.findById.mockResolvedValue(mockHistory);
      mockProgressHistoryRepository.delete.mockResolvedValue(undefined);

      // Act
      await service.deleteProgressHistory(historyId);

      // Assert
      expect(mockProgressHistoryRepository.findById).toHaveBeenCalledWith(historyId);
      expect(mockProgressHistoryRepository.delete).toHaveBeenCalledWith(historyId);
    });

    it('進捗履歴が見つからない場合はエラーを投げる', async () => {
      // Arrange
      mockProgressHistoryRepository.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(service.deleteProgressHistory(1)).rejects.toThrow('進捗履歴が見つかりません');
    });
  });
});