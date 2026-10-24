import { WbsImportScheduleRepository } from '@/infrastructures/import-schedule/wbs-import-schedule-repository';
import { ImportScheduleSettingsRepository } from '@/infrastructures/import-schedule/import-schedule-settings-repository';
import { WbsImportSchedule } from '@/domains/import-schedule/wbs-import-schedule';
import { ImportScheduleSettings } from '@/domains/import-schedule/import-schedule-settings';

describe('WbsImportScheduleRepository Integration Tests', () => {
  let repository: WbsImportScheduleRepository;
  let projectId: string;
  const wbsIds: number[] = [];

  // 2026-10-24 10:00 JST
  const NOW = new Date('2026-10-24T01:00:00.000Z');

  const settings = {
    isEnabled: true,
    cronExpression: '0 9,12,17 * * *',
    syncMode: 'replace' as const,
    includeActuals: true,
  };

  const createWbs = async (name: string): Promise<number> => {
    const wbs = await global.prisma.wbs.create({ data: { name, projectId } });
    wbsIds.push(wbs.id);
    return wbs.id;
  };

  beforeAll(async () => {
    repository = new WbsImportScheduleRepository();
    const project = await global.prisma.projects.create({
      data: {
        name: `定期インポートテスト-${Date.now()}`,
        status: 'ACTIVE',
        startDate: new Date('2026-01-01T00:00:00.000Z'),
        endDate: new Date('2026-12-31T00:00:00.000Z'),
      },
    });
    projectId = project.id;
  });

  afterAll(async () => {
    await global.prisma.wbsImportSchedule.deleteMany({ where: { wbsId: { in: wbsIds } } });
    await global.prisma.wbs.deleteMany({ where: { id: { in: wbsIds } } });
    await global.prisma.projects.delete({ where: { id: projectId } });
  });

  it('保存した設定を wbsId で取得できる（新規・更新）', async () => {
    const wbsId = await createWbs('WBS-保存');

    await repository.save(WbsImportSchedule.create(wbsId, settings, NOW));
    const created = await repository.findByWbsId(wbsId);

    expect(created).toEqual(
      expect.objectContaining({
        wbsId,
        isEnabled: true,
        cronExpression: '0 9,12,17 * * *',
        timezone: 'Asia/Tokyo',
        syncMode: 'replace',
        includeActuals: true,
        nextRunAt: new Date('2026-10-24T03:00:00.000Z'),
        lastRunAt: null,
      })
    );

    await repository.save(created!.changeSettings({ ...settings, isEnabled: false, syncMode: 'diff' }, NOW));
    const updated = await repository.findByWbsId(wbsId);

    expect(updated).toEqual(expect.objectContaining({ isEnabled: false, syncMode: 'diff', nextRunAt: null }));
  });

  it('未設定のWBSは null', async () => {
    const wbsId = await createWbs('WBS-未設定');

    await expect(repository.findByWbsId(wbsId)).resolves.toBeNull();
  });

  it('findDue: 有効で次回実行日時を過ぎた設定だけを返す', async () => {
    const dueWbsId = await createWbs('WBS-期限到来');
    const futureWbsId = await createWbs('WBS-まだ');
    const disabledWbsId = await createWbs('WBS-無効');
    await repository.save(WbsImportSchedule.create(dueWbsId, settings, NOW)); // 次回 12:00 JST
    await repository.save(WbsImportSchedule.create(futureWbsId, { ...settings, cronExpression: '0 17 * * *' }, NOW));
    await repository.save(WbsImportSchedule.create(disabledWbsId, { ...settings, isEnabled: false }, NOW));

    const due = await repository.findDue(new Date('2026-10-24T03:00:30.000Z'));

    expect(due.map((schedule) => schedule.wbsId).filter((id) => wbsIds.includes(id))).toEqual([dueWbsId]);
  });

  it('updateIfNextRunAt: 次回実行日時が期待値のときだけ更新でき、同時に進めても成功するのは1件だけ', async () => {
    const wbsId = await createWbs('WBS-起動');
    const schedule = WbsImportSchedule.create(wbsId, settings, NOW);
    await repository.save(schedule);
    const runAt = new Date('2026-10-24T03:00:05.000Z');

    const results = await Promise.all([
      repository.updateIfNextRunAt(schedule.markRun(runAt), schedule.nextRunAt!),
      repository.updateIfNextRunAt(schedule.markRun(runAt), schedule.nextRunAt!),
    ]);

    expect(results.filter(Boolean)).toHaveLength(1);
    const saved = await repository.findByWbsId(wbsId);
    expect(saved?.lastRunAt).toEqual(runAt);
    expect(saved?.nextRunAt).toEqual(new Date('2026-10-24T08:00:00.000Z'));

    // 既に進めた後の古い次回実行日時では更新できない
    await expect(repository.updateIfNextRunAt(schedule.markRun(runAt), schedule.nextRunAt!)).resolves.toBe(false);
  });

  it('updateIfNextRunAt: DBを直接更新してマイクロ秒を含む次回実行日時になっても、取得した値で進められる', async () => {
    const wbsId = await createWbs('WBS-手動更新');
    await repository.save(WbsImportSchedule.create(wbsId, settings, NOW));
    await global.prisma.$executeRaw`
      UPDATE wbs_import_schedules SET "nextRunAt" = TIMESTAMPTZ '2026-10-24 03:00:00.123456+00' WHERE "wbsId" = ${wbsId}`;

    const [due] = (await repository.findDue(new Date('2026-10-24T03:00:30.000Z'))).filter((s) => s.wbsId === wbsId);

    await expect(repository.updateIfNextRunAt(due.markRun(new Date('2026-10-24T03:00:30.000Z')), due.nextRunAt!)).resolves.toBe(true);
  });

  it('WBSを削除すると設定も削除される', async () => {
    const wbsId = await createWbs('WBS-削除');
    await repository.save(WbsImportSchedule.create(wbsId, settings, NOW));

    await global.prisma.wbs.delete({ where: { id: wbsId } });

    await expect(repository.findByWbsId(wbsId)).resolves.toBeNull();
  });

  it('findAll: 保存済みの設定をすべて返す', async () => {
    const wbsId = await createWbs('WBS-一覧');
    await repository.save(WbsImportSchedule.create(wbsId, settings, NOW));

    const all = await repository.findAll();

    expect(all.map((schedule) => schedule.wbsId)).toContain(wbsId);
  });
});

describe('ImportScheduleSettingsRepository Integration Tests', () => {
  const repository = new ImportScheduleSettingsRepository();

  afterAll(async () => {
    await global.prisma.importScheduleSettings.deleteMany();
  });

  it('未保存の場合は既定値（有効）を返し、更新した値を取得できる', async () => {
    await global.prisma.importScheduleSettings.deleteMany();

    await expect(repository.get()).resolves.toEqual(expect.objectContaining({ isEnabled: true }));

    await repository.update(ImportScheduleSettings.create(false));

    await expect(repository.get()).resolves.toEqual(expect.objectContaining({ isEnabled: false }));
  });
});
