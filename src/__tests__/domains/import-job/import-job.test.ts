import { ImportJob, ImportJobOptions } from '@/domains/import-job/import-job';
import { ImportJobStatuses } from '@/domains/import-job/import-job-enums';

describe('ImportJob', () => {
  const createDefaultOptions = (overrides?: Partial<ImportJobOptions & { createdBy?: string | null }>): ImportJobOptions & { createdBy?: string | null } => ({
    type: 'GEPPO',
    targetMonth: '2025-06',
    targetProjectIds: ['proj-1'],
    options: { dryRun: false },
    ...overrides,
  });

  describe('create', () => {
    it('PENDING状態で新規ジョブが作成される', () => {
      const job = ImportJob.create(createDefaultOptions());

      expect(job.status).toBe(ImportJobStatuses.PENDING);
      expect(job.type).toBe('GEPPO');
      expect(job.targetMonth).toBe('2025-06');
      expect(job.targetProjectIds).toEqual(['proj-1']);
      expect(job.totalRecords).toBe(0);
      expect(job.processedRecords).toBe(0);
      expect(job.successCount).toBe(0);
      expect(job.errorCount).toBe(0);
    });

    it('createdBy が設定される', () => {
      const job = ImportJob.create(createDefaultOptions({ createdBy: 'user-1' }));
      expect(job.createdBy).toBe('user-1');
    });

    it('createdBy 省略時は null', () => {
      const job = ImportJob.create(createDefaultOptions());
      expect(job.createdBy).toBeNull();
    });
  });

  describe('start - ステータス遷移', () => {
    it('PENDING → RUNNING に遷移する', () => {
      const job = ImportJob.create(createDefaultOptions());
      job.start();

      expect(job.status).toBe(ImportJobStatuses.RUNNING);
      expect(job.startedAt).toBeInstanceOf(Date);
    });

    it('RUNNING 状態から start すると例外', () => {
      const job = ImportJob.create(createDefaultOptions());
      job.start();

      expect(() => job.start()).toThrow('ジョブは開始可能な状態ではありません');
    });

    it('COMPLETED 状態から start すると例外', () => {
      const job = ImportJob.create(createDefaultOptions());
      job.start();
      job.complete({ summary: 'done' });

      expect(() => job.start()).toThrow('ジョブは開始可能な状態ではありません');
    });
  });

  describe('updateProgress', () => {
    it('RUNNING 状態で進捗を更新できる', () => {
      const job = ImportJob.create(createDefaultOptions());
      job.start();
      job.updateProgress(50, 45, 5);

      expect(job.processedRecords).toBe(50);
      expect(job.successCount).toBe(45);
      expect(job.errorCount).toBe(5);
    });

    it('PENDING 状態では更新できない', () => {
      const job = ImportJob.create(createDefaultOptions());

      expect(() => job.updateProgress(10, 10, 0)).toThrow('実行中のジョブのみ進捗を更新できます');
    });

    it('COMPLETED 状態では更新できない', () => {
      const job = ImportJob.create(createDefaultOptions());
      job.start();
      job.complete({});

      expect(() => job.updateProgress(10, 10, 0)).toThrow('実行中のジョブのみ進捗を更新できます');
    });
  });

  describe('complete', () => {
    it('RUNNING → COMPLETED に遷移する', () => {
      const job = ImportJob.create(createDefaultOptions());
      job.start();
      job.complete({ imported: 100 });

      expect(job.status).toBe(ImportJobStatuses.COMPLETED);
      expect(job.completedAt).toBeInstanceOf(Date);
      expect(job.result).toEqual({ imported: 100 });
    });

    it('PENDING 状態からは完了できない', () => {
      const job = ImportJob.create(createDefaultOptions());

      expect(() => job.complete({})).toThrow('実行中のジョブのみ完了できます');
    });
  });

  describe('fail', () => {
    it('RUNNING → FAILED に遷移する', () => {
      const job = ImportJob.create(createDefaultOptions());
      job.start();
      job.fail({ error: 'timeout' });

      expect(job.status).toBe(ImportJobStatuses.FAILED);
      expect(job.completedAt).toBeInstanceOf(Date);
      expect(job.errorDetails).toEqual({ error: 'timeout' });
    });

    it('PENDING → FAILED に遷移する', () => {
      const job = ImportJob.create(createDefaultOptions());
      job.fail({ error: 'init failed' });

      expect(job.status).toBe(ImportJobStatuses.FAILED);
    });

    it('COMPLETED 状態からは失敗にできない', () => {
      const job = ImportJob.create(createDefaultOptions());
      job.start();
      job.complete({});

      expect(() => job.fail({ error: 'late' })).toThrow('実行中または待機中のジョブのみ失敗にできます');
    });
  });

  describe('cancel', () => {
    it('PENDING → CANCELLED に遷移する', () => {
      const job = ImportJob.create(createDefaultOptions());
      job.cancel();

      expect(job.status).toBe(ImportJobStatuses.CANCELLED);
      expect(job.completedAt).toBeInstanceOf(Date);
    });

    it('RUNNING → CANCELLED に遷移する', () => {
      const job = ImportJob.create(createDefaultOptions());
      job.start();
      job.cancel();

      expect(job.status).toBe(ImportJobStatuses.CANCELLED);
    });

    it('COMPLETED からはキャンセルできない', () => {
      const job = ImportJob.create(createDefaultOptions());
      job.start();
      job.complete({});

      expect(() => job.cancel()).toThrow('完了または失敗したジョブはキャンセルできません');
    });

    it('FAILED からはキャンセルできない', () => {
      const job = ImportJob.create(createDefaultOptions());
      job.start();
      job.fail({});

      expect(() => job.cancel()).toThrow('完了または失敗したジョブはキャンセルできません');
    });
  });

  describe('progress getter', () => {
    it('totalRecords=0 の場合は 0 を返す', () => {
      const job = ImportJob.create(createDefaultOptions());
      expect(job.progress).toBe(0);
    });

    it('進捗率が正しく計算される', () => {
      const job = ImportJob.create(createDefaultOptions());
      job.start();
      job.totalRecords = 200;
      job.updateProgress(100, 90, 10);

      expect(job.progress).toBe(50); // Math.round(100/200 * 100)
    });

    it('端数が四捨五入される', () => {
      const job = ImportJob.create(createDefaultOptions());
      job.start();
      job.totalRecords = 3;
      job.updateProgress(1, 1, 0);

      expect(job.progress).toBe(33); // Math.round(1/3 * 100) = 33
    });
  });

  describe('状態判定 getter', () => {
    it('isRunning', () => {
      const job = ImportJob.create(createDefaultOptions());
      expect(job.isRunning).toBe(false);
      job.start();
      expect(job.isRunning).toBe(true);
    });

    it('isCompleted', () => {
      const job = ImportJob.create(createDefaultOptions());
      job.start();
      expect(job.isCompleted).toBe(false);
      job.complete({});
      expect(job.isCompleted).toBe(true);
    });

    it('isFailed', () => {
      const job = ImportJob.create(createDefaultOptions());
      job.start();
      job.fail({});
      expect(job.isFailed).toBe(true);
    });

    it('isCancelled', () => {
      const job = ImportJob.create(createDefaultOptions());
      job.cancel();
      expect(job.isCancelled).toBe(true);
    });

    it('isFinished: COMPLETED/FAILED/CANCELLED で true', () => {
      const completed = ImportJob.create(createDefaultOptions());
      completed.start();
      completed.complete({});
      expect(completed.isFinished).toBe(true);

      const failed = ImportJob.create(createDefaultOptions());
      failed.start();
      failed.fail({});
      expect(failed.isFinished).toBe(true);

      const cancelled = ImportJob.create(createDefaultOptions());
      cancelled.cancel();
      expect(cancelled.isFinished).toBe(true);
    });

    it('isFinished: PENDING/RUNNING で false', () => {
      const pending = ImportJob.create(createDefaultOptions());
      expect(pending.isFinished).toBe(false);

      const running = ImportJob.create(createDefaultOptions());
      running.start();
      expect(running.isFinished).toBe(false);
    });
  });
});
