import { GetEstimationAccuracyHandler } from '@/applications/estimation-accuracy/get-estimation-accuracy-handler';
import { GetEstimationAccuracyQuery } from '@/applications/estimation-accuracy/get-estimation-accuracy-query';
import type {
  IEstimationAccuracyQueryRepository,
  CompletedTaskEstimate,
} from '@/applications/estimation-accuracy/iestimation-accuracy-query-repository';

describe('GetEstimationAccuracyHandler', () => {
  const estimate = (overrides: Partial<CompletedTaskEstimate>): CompletedTaskEstimate => ({
    projectId: 'p1',
    projectName: '案件A',
    phaseId: 10,
    phaseName: '基本設計',
    phaseTemplateId: 1,
    phaseTemplateName: '基本設計',
    baselineHours: 10,
    actualHours: 12,
    ...overrides,
  });

  let repository: { listCompletedTaskEstimates: jest.Mock };
  let handler: GetEstimationAccuracyHandler;

  beforeEach(() => {
    repository = {
      listCompletedTaskEstimates: jest.fn().mockResolvedValue([
        estimate({}),
        estimate({ projectId: 'p2', projectName: '案件B', phaseId: 20, baselineHours: 20, actualHours: 30 }),
        // テンプレート未設定の工程は工程名でまとめる
        estimate({ phaseId: 11, phaseName: '移行', phaseTemplateId: null, phaseTemplateName: null, baselineHours: 5, actualHours: 5 }),
        estimate({ projectId: 'p2', projectName: '案件B', phaseId: 21, phaseName: '移行', phaseTemplateId: null, phaseTemplateName: null, baselineHours: 5, actualHours: 10 }),
        // 工程未設定
        estimate({ phaseId: null, phaseName: null, phaseTemplateId: null, phaseTemplateName: null, baselineHours: 8, actualHours: 4 }),
      ]),
    };
    handler = new GetEstimationAccuracyHandler(
      repository as unknown as IEstimationAccuracyQueryRepository
    );
  });

  it('工程テンプレート別（プロジェクト横断）に集計する。テンプレート未設定は工程名、工程未設定は「未分類」でまとめる', async () => {
    const result = await handler.execute(new GetEstimationAccuracyQuery());

    expect(result.byPhaseTemplate.map((row) => [row.label, row.projectCount, row.taskCount, row.actualToBaselineRatio])).toEqual([
      ['基本設計', 2, 2, 42 / 30],
      ['移行', 2, 2, 15 / 10],
      ['未分類', 1, 1, 0.5],
    ]);
  });

  it('プロジェクト×工程別に集計する', async () => {
    const result = await handler.execute(new GetEstimationAccuracyQuery());

    expect(result.byProjectPhase.map((row) => row.label)).toEqual([
      '案件A / 基本設計',
      '案件B / 基本設計',
      '案件A / 移行',
      '案件B / 移行',
      '案件A / 未分類',
    ]);
  });

  it('全体の合計も返す', async () => {
    const result = await handler.execute(new GetEstimationAccuracyQuery());

    expect(result.total).toMatchObject({ taskCount: 5, baselineHours: 48, actualHours: 61, projectCount: 2 });
  });
});
