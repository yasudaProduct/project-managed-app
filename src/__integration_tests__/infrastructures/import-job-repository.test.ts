import { ImportJobRepository } from '@/infrastructures/import-job/import-job-repository';
import { ImportJob } from '@/domains/import-job/import-job';
import { ImportJobStatuses } from '@/domains/import-job/import-job-enums';

describe('ImportJobRepository Integration Tests', () => {
  let repository: ImportJobRepository;
  const createdJobIds: string[] = [];

  const createPendingJob = async (): Promise<ImportJob> => {
    const job = await repository.create(ImportJob.create({ type: 'GEPPO', targetMonth: '2026-09', options: {} }));
    createdJobIds.push(job.id);
    return job;
  };

  beforeAll(() => {
    repository = new ImportJobRepository();
  });

  afterAll(async () => {
    await global.prisma.importJob.deleteMany({ where: { id: { in: createdJobIds } } });
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
      const running = await repository.findById(job.id);
      running!.start();
      await repository.update(running!);

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
});
