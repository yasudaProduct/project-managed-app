import { SteadyWorkPlanRepository } from '@/infrastructures/standing-work/steady-work-plan-repository';
import { SteadyWorkPlan } from '@/domains/standing-work/steady-work-plan';
import { cleanupTestData, seedTestProject, testIds } from '../helpers';

/**
 * 定常枠リポジトリ（docs/plans/non-project-work-management.md §11.3）。
 * - 単位・時間・有効期間の往復
 * - WBS 単位・範囲交差（findActiveByWbsIds）の絞り込みと所属タスク情報
 * - タスク削除で定常枠も消える（onDelete: Cascade）
 */
describe('SteadyWorkPlanRepository Integration Tests', () => {
  let repository: SteadyWorkPlanRepository;
  let taskId: number;
  let otherTaskId: number;
  const d = (ymd: string) => new Date(`${ymd}T00:00:00.000Z`);

  beforeAll(async () => {
    repository = new SteadyWorkPlanRepository();
    await seedTestProject(global.prisma);

    const task = await global.prisma.wbsTask.create({
      data: {
        taskNo: `STD-${Date.now() % 1000}`,
        wbsId: testIds.wbsId,
        phaseId: testIds.phaseId,
        name: '保守対応',
        status: 'NOT_STARTED',
      },
    });
    taskId = task.id;
    testIds.taskId = task.id;

    const otherTask = await global.prisma.wbsTask.create({
      data: {
        taskNo: `STD-${(Date.now() + 1) % 1000}`,
        wbsId: testIds.wbsId,
        phaseId: testIds.phaseId,
        name: '社内雑務',
        status: 'NOT_STARTED',
      },
    });
    otherTaskId = otherTask.id;
  });

  afterAll(async () => {
    await global.prisma.wbsTask.delete({ where: { id: otherTaskId } }).catch(() => {});
    await cleanupTestData(global.prisma);
  });

  it('定常枠を作成し、ID で取得できること（単位・時間・無期限の往復）', async () => {
    const created = await repository.create(
      SteadyWorkPlan.create({ taskId, unit: 'PER_MONTH', hours: 20.5, validFrom: d('2026-04-01') })
    );

    expect(created.id).toBeTruthy();
    const fetched = await repository.findById(created.id!);
    expect(fetched).not.toBeNull();
    expect(fetched?.taskId).toBe(taskId);
    expect(fetched?.unit).toBe('PER_MONTH');
    expect(fetched?.hours).toBe(20.5);
    expect(fetched?.validFrom).toEqual(d('2026-04-01'));
    expect(fetched?.validTo).toBeUndefined();
  });

  it('タスク・WBS 単位で有効期間の開始日順に取得できること', async () => {
    const plans = await repository.findByTaskId(taskId);
    expect(plans).toHaveLength(1);

    await repository.create(
      SteadyWorkPlan.create({ taskId, unit: 'PER_DAY', hours: 2, validFrom: d('2025-10-01'), validTo: d('2026-03-31') })
    );
    await repository.create(
      SteadyWorkPlan.create({ taskId: otherTaskId, unit: 'PER_DAY', hours: 0.5, validFrom: d('2026-01-01') })
    );

    const byTask = await repository.findByTaskId(taskId);
    expect(byTask.map((plan) => plan.validFrom)).toEqual([d('2025-10-01'), d('2026-04-01')]);

    const byWbs = await repository.findByWbsId(testIds.wbsId);
    expect(byWbs).toHaveLength(3);
    expect(byWbs.filter((plan) => plan.taskId === otherTaskId)).toHaveLength(1);
  });

  it('範囲と交差する定常枠だけを所属タスク情報付きで返すこと', async () => {
    // 2026-05 の範囲: 無期限の枠（4/1〜）と他タスクの枠（1/1〜）は含まれ、3/31 で終わる枠は含まれない
    const active = await repository.findActiveByWbsIds([testIds.wbsId], {
      start: d('2026-05-01'),
      end: d('2026-05-31'),
    });

    expect(active.map((entry) => [entry.task.id, entry.plan.unit, entry.plan.hours])).toEqual([
      [taskId, 'PER_MONTH', 20.5],
      [otherTaskId, 'PER_DAY', 0.5],
    ]);
    expect(active[0].task).toEqual({ id: taskId, name: '保守対応', wbsId: testIds.wbsId, assigneeId: null });

    // 範囲が枠の開始より前なら含まれない
    const before = await repository.findActiveByWbsIds([testIds.wbsId], {
      start: d('2025-01-01'),
      end: d('2025-09-30'),
    });
    expect(before).toHaveLength(0);

    // 対象 WBS が空なら問い合わせない
    expect(await repository.findActiveByWbsIds([], { start: d('2026-05-01'), end: d('2026-05-31') })).toEqual([]);
  });

  it('定常枠を更新・削除できること', async () => {
    const target = (await repository.findByTaskId(taskId)).find((plan) => plan.unit === 'PER_MONTH')!;

    const updated = await repository.update(
      SteadyWorkPlan.createFromDb({
        id: target.id!,
        taskId,
        unit: 'PER_DAY',
        hours: 1,
        validFrom: d('2026-04-01'),
        validTo: d('2026-12-31'),
      })
    );
    expect(updated.unit).toBe('PER_DAY');
    expect(updated.validTo).toEqual(d('2026-12-31'));

    await repository.delete(target.id!);
    expect(await repository.findById(target.id!)).toBeNull();
  });

  it('タスクを削除すると定常枠も削除されること', async () => {
    expect(await repository.findByTaskId(otherTaskId)).toHaveLength(1);

    await global.prisma.wbsTask.delete({ where: { id: otherTaskId } });

    expect(await repository.findByTaskId(otherTaskId)).toHaveLength(0);
  });
});
