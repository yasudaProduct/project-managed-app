import { ImportJobRepository } from '@/infrastructures/import-job/import-job-repository';
import { ImportJob } from '@/domains/import-job/import-job';
import { ImportJobStatuses } from '@/domains/import-job/import-job-enums';

describe('ImportJobRepository Integration Tests', () => {
  let repository: ImportJobRepository;

  const createPendingJob = async (targetMonth = '2026-09'): Promise<ImportJob> =>
    repository.create(ImportJob.create({ type: 'GEPPO', targetMonth, options: {} }));

  /** 保存済みのジョブを RUNNING にする */
  const markRunning = async (job: ImportJob): Promise<void> => {
    const running = await repository.findById(job.id);
    running!.start();
    await repository.update(running!);
  };

  beforeAll(() => {
    repository = new ImportJobRepository();
  });

  // 「他に RUNNING のジョブがあるか」を判定するため、テストごとにジョブを空にする（テスト用DB）
  beforeEach(async () => {
    await global.prisma.importJobProgress.deleteMany();
    await global.prisma.importJob.deleteMany();
  });

  afterAll(async () => {
    await global.prisma.importJobProgress.deleteMany();
    await global.prisma.importJob.deleteMany();
  });

  describe('updateIfStatus', () => {
    it('現在のステータスが期待値と一致する場合は更新して true を返す', async () => {
      const job = await createPendingJob();
      job.start();

      const isUpdated = await repository.updateIfStatus(job, ImportJobStatuses.PENDING);

      expect(isUpdated).toBe(true);
      const saved = await repository.findById(job.id);
      expect(saved?.status).toBe(ImportJobStatuses.RUNNING);
      expect(saved?.startedAt).toEqual(job.startedAt);
    });

    it('現在のステータスが期待値と異なる場合は更新せず false を返す', async () => {
      const job = await createPendingJob();
      await markRunning(job);

      const stale = await repository.findById(job.id);
      stale!.cancel();
      const isUpdated = await repository.updateIfStatus(stale!, ImportJobStatuses.PENDING);

      expect(isUpdated).toBe(false);
      const saved = await repository.findById(job.id);
      expect(saved?.status).toBe(ImportJobStatuses.RUNNING);
    });

    it('同じ PENDING ジョブを同時に RUNNING へ更新しても、成功するのは1件だけ', async () => {
      const job = await createPendingJob();
      const first = await repository.findById(job.id);
      const second = await repository.findById(job.id);
      first!.start();
      second!.start();

      const results = await Promise.all([
        repository.updateIfStatus(first!, ImportJobStatuses.PENDING),
        repository.updateIfStatus(second!, ImportJobStatuses.PENDING),
      ]);

      expect(results.filter(Boolean)).toHaveLength(1);
      const saved = await repository.findById(job.id);
      expect(saved?.status).toBe(ImportJobStatuses.RUNNING);
    });
  });

  describe('updateIfStartable', () => {
    it('PENDING で他に RUNNING のジョブがなければ RUNNING として保存し STARTED を返す', async () => {
      const job = await createPendingJob();
      job.start();

      await expect(repository.updateIfStartable(job)).resolves.toBe('STARTED');
      expect((await repository.findById(job.id))?.status).toBe(ImportJobStatuses.RUNNING);
    });

    it('他に RUNNING のジョブがあれば更新せず BUSY を返す', async () => {
      await markRunning(await createPendingJob('2026-08'));
      const job = await createPendingJob();
      job.start();

      await expect(repository.updateIfStartable(job)).resolves.toBe('BUSY');
      expect((await repository.findById(job.id))?.status).toBe(ImportJobStatuses.PENDING);
    });

    it('保存済みのジョブが PENDING でなければ更新せず NOT_PENDING を返す', async () => {
      const job = await createPendingJob();
      const cancelled = await repository.findById(job.id);
      cancelled!.cancel();
      await repository.update(cancelled!);
      job.start();

      await expect(repository.updateIfStartable(job)).resolves.toBe('NOT_PENDING');
      expect((await repository.findById(job.id))?.status).toBe(ImportJobStatuses.CANCELLED);
    });

    it('別々の PENDING ジョブを同時に開始しても、RUNNING になるのは1件だけ', async () => {
      const jobs = await Promise.all(['2026-07', '2026-08', '2026-09'].map((month) => createPendingJob(month)));
      jobs.forEach((job) => job.start());

      const results = await Promise.all(jobs.map((job) => repository.updateIfStartable(job)));

      expect(results.filter((result) => result === 'STARTED')).toHaveLength(1);
      expect(results.filter((result) => result === 'BUSY')).toHaveLength(2);
      expect(await repository.findByStatus(ImportJobStatuses.RUNNING)).toHaveLength(1);
    });
  });

  describe('findByStatus', () => {
    it('作成順（古い順）に返す', async () => {
      const first = await createPendingJob('2026-07');
      const second = await createPendingJob('2026-08');
      const third = await createPendingJob('2026-09');

      const pending = await repository.findByStatus(ImportJobStatuses.PENDING);

      expect(pending.map((job) => job.id)).toEqual([first.id, second.id, third.id]);
    });
  });
});
