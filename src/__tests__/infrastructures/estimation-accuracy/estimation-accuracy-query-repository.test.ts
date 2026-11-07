import { EstimationAccuracyQueryRepository } from '@/infrastructures/estimation-accuracy/estimation-accuracy-query-repository';
import type { PrismaClient } from '@prisma/client';

describe('EstimationAccuracyQueryRepository', () => {
  let prismaMock: {
    projects: { findMany: jest.Mock };
    wbsTask: { findMany: jest.Mock };
    workRecord: { groupBy: jest.Mock };
  };
  let repository: EstimationAccuracyQueryRepository;

  const period = (type: 'KIJUN' | 'YOTEI', kosu: number) => ({
    type,
    kosus: [{ type: 'NORMAL', kosu }],
  });

  beforeEach(() => {
    prismaMock = {
      projects: {
        findMany: jest.fn().mockResolvedValue([
          { id: 'p1', name: '案件A', wbs: [{ id: 1 }] },
          { id: 'p2', name: '案件B', wbs: [] },
        ]),
      },
      wbsTask: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 100,
            wbsId: 1,
            phase: { id: 10, name: '基本設計', template: { id: 1, name: '基本設計' } },
            periods: [period('KIJUN', 10), period('YOTEI', 12)],
          },
          {
            id: 101,
            wbsId: 1,
            phase: null,
            periods: [period('YOTEI', 6)],
          },
        ]),
      },
      workRecord: {
        groupBy: jest.fn().mockResolvedValue([{ taskId: 100, _sum: { hours_worked: 14 } }]),
      },
    };
    repository = new EstimationAccuracyQueryRepository(prismaMock as unknown as PrismaClient);
  });

  it('中止以外の案件（常設を除く）の最新WBSにある完了タスクを対象にする', async () => {
    await repository.listCompletedTaskEstimates();

    expect(prismaMock.projects.findMany).toHaveBeenCalledWith(
      // 常設プロジェクト（定常・不定期作業の受け皿）は見積精度の対象外
      expect.objectContaining({ where: { status: { not: 'CANCELLED' }, kind: 'PROJECT' } })
    );
    expect(prismaMock.wbsTask.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { wbsId: { in: [1] }, status: 'COMPLETED', isDeleted: false },
      })
    );
  });

  it('基準工数（KIJUN、なければ予定）・実績工数・工程・工程テンプレートを返す', async () => {
    const result = await repository.listCompletedTaskEstimates();

    expect(result).toEqual([
      {
        projectId: 'p1',
        projectName: '案件A',
        phaseId: 10,
        phaseName: '基本設計',
        phaseTemplateId: 1,
        phaseTemplateName: '基本設計',
        baselineHours: 10,
        actualHours: 14,
      },
      {
        projectId: 'p1',
        projectName: '案件A',
        phaseId: null,
        phaseName: null,
        phaseTemplateId: null,
        phaseTemplateName: null,
        baselineHours: 6,
        actualHours: 0,
      },
    ]);
  });

  it('対象のWBSがなければ問い合わせない', async () => {
    prismaMock.projects.findMany.mockResolvedValue([{ id: 'p2', name: '案件B', wbs: [] }]);

    expect(await repository.listCompletedTaskEstimates()).toEqual([]);
    expect(prismaMock.wbsTask.findMany).not.toHaveBeenCalled();
  });
});
