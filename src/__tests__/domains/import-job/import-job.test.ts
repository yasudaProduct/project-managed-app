import { ImportJob } from '@/domains/import-job/import-job';
import { ImportJobStatuses } from '@/domains/import-job/import-job-enums';

describe('ImportJob', () => {
  const createPendingJob = (): ImportJob => {
    return ImportJob.create({
      type: 'WBS',
      targetMonth: '2026-01',
      options: { mode: 'full' },
      createdBy: 'user-1',
    });
  };

  const createRunningJob = (): ImportJob => {
    const job = createPendingJob();
    job.start();
    return job;
  };

  describe('create', () => {
    it('PENDINGステータスでジョブを作成する', () => {
      const job = createPendingJob();

      expect(job.status).toBe(ImportJobStatuses.PENDING);
      expect(job.type).toBe('WBS');
      expect(job.targetMonth).toBe('2026-01');
      expect(job.createdBy).toBe('user-1');
      expect(job.options).toEqual({ mode: 'full' });
      expect(job.totalRecords).toBe(0);
      expect(job.processedRecords).toBe(0);
      expect(job.successCount).toBe(0);
      expect(job.errorCount).toBe(0);
    });

    it('createdByが未指定の場合nullになる', () => {
      const job = ImportJob.create({
        type: 'GEPPO',
        options: {},
      });

      expect(job.createdBy).toBeNull();
    });

    it('targetProjectIdsが未指定の場合空配列になる', () => {
      const job = ImportJob.create({
        type: 'WBS',
        options: {},
      });

      expect(job.targetProjectIds).toEqual([]);
    });
  });

  describe('start', () => {
    it('PENDINGジョブを開始できる', () => {
      const job = createPendingJob();
      job.start();

      expect(job.status).toBe(ImportJobStatuses.RUNNING);
      expect(job.startedAt).toBeInstanceOf(Date);
    });

    it('PENDING以外のジョブを開始するとエラーになる', () => {
      const job = createRunningJob();

      expect(() => job.start()).toThrow('ジョブは開始可能な状態ではありません');
    });
  });

  describe('updateProgress', () => {
    it('RUNNINGジョブの進捗を更新できる', () => {
      const job = createRunningJob();
      job.updateProgress(50, 45, 5);

      expect(job.processedRecords).toBe(50);
      expect(job.successCount).toBe(45);
      expect(job.errorCount).toBe(5);
    });

    it('RUNNING以外のジョブの進捗更新はエラーになる', () => {
      const job = createPendingJob();

      expect(() => job.updateProgress(10, 10, 0)).toThrow('実行中のジョブのみ進捗を更新できます');
    });
  });

  describe('complete', () => {
    it('RUNNINGジョブを完了できる', () => {
      const job = createRunningJob();
      const result = { summary: 'ok' };
      job.complete(result);

      expect(job.status).toBe(ImportJobStatuses.COMPLETED);
      expect(job.completedAt).toBeInstanceOf(Date);
      expect(job.result).toEqual(result);
    });

    it('RUNNING以外のジョブを完了するとエラーになる', () => {
      const job = createPendingJob();

      expect(() => job.complete({})).toThrow('実行中のジョブのみ完了できます');
    });
  });

  describe('fail', () => {
    it('RUNNINGジョブを失敗にできる', () => {
      const job = createRunningJob();
      const errorDetails = { error: 'connection timeout' };
      job.fail(errorDetails);

      expect(job.status).toBe(ImportJobStatuses.FAILED);
      expect(job.completedAt).toBeInstanceOf(Date);
      expect(job.errorDetails).toEqual(errorDetails);
    });

    it('PENDINGジョブも失敗にできる', () => {
      const job = createPendingJob();
      job.fail({ error: 'initialization failed' });

      expect(job.status).toBe(ImportJobStatuses.FAILED);
    });

    it('COMPLETEDジョブを失敗にするとエラーになる', () => {
      const job = createRunningJob();
      job.complete({});

      expect(() => job.fail({})).toThrow('実行中または待機中のジョブのみ失敗にできます');
    });
  });

  describe('cancel', () => {
    it('PENDINGジョブをキャンセルできる', () => {
      const job = createPendingJob();
      job.cancel();

      expect(job.status).toBe(ImportJobStatuses.CANCELLED);
      expect(job.completedAt).toBeInstanceOf(Date);
    });

    it('RUNNINGジョブをキャンセルできる', () => {
      const job = createRunningJob();
      job.cancel();

      expect(job.status).toBe(ImportJobStatuses.CANCELLED);
    });

    it('COMPLETEDジョブをキャンセルするとエラーになる', () => {
      const job = createRunningJob();
      job.complete({});

      expect(() => job.cancel()).toThrow('完了または失敗したジョブはキャンセルできません');
    });

    it('FAILEDジョブをキャンセルするとエラーになる', () => {
      const job = createRunningJob();
      job.fail({});

      expect(() => job.cancel()).toThrow('完了または失敗したジョブはキャンセルできません');
    });
  });

  describe('progress', () => {
    it('totalRecordsが0の場合0を返す', () => {
      const job = createPendingJob();
      expect(job.progress).toBe(0);
    });

    it('進捗率を正しく計算する', () => {
      const job = createRunningJob();
      job.totalRecords = 100;
      job.updateProgress(50, 45, 5);

      expect(job.progress).toBe(50);
    });

    it('進捗率を四捨五入する', () => {
      const job = createRunningJob();
      job.totalRecords = 3;
      job.updateProgress(1, 1, 0);

      expect(job.progress).toBe(33);
    });
  });

  describe('ステータスゲッター', () => {
    it('isRunning', () => {
      const job = createRunningJob();
      expect(job.isRunning).toBe(true);
      expect(job.isCompleted).toBe(false);
      expect(job.isFailed).toBe(false);
      expect(job.isCancelled).toBe(false);
      expect(job.isFinished).toBe(false);
    });

    it('isCompleted', () => {
      const job = createRunningJob();
      job.complete({});
      expect(job.isCompleted).toBe(true);
      expect(job.isFinished).toBe(true);
    });

    it('isFailed', () => {
      const job = createRunningJob();
      job.fail({});
      expect(job.isFailed).toBe(true);
      expect(job.isFinished).toBe(true);
    });

    it('isCancelled', () => {
      const job = createPendingJob();
      job.cancel();
      expect(job.isCancelled).toBe(true);
      expect(job.isFinished).toBe(true);
    });
  });
});
