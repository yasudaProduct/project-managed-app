import { WbsEvmRepository } from '@/infrastructures/evm/wbs-evm-repository';
import type { IWbsQueryRepository, WbsTaskData } from '@/applications/wbs/query/iwbs-query-repository';
import prisma from '@/lib/prisma/prisma';

// Prismaクライアントのモック化
jest.mock('@/lib/prisma/prisma', () => ({
  __esModule: true,
  default: {
    wbs: {
      findUnique: jest.fn(),
    },
    wbsBuffer: {
      findMany: jest.fn(),
    },
    projectSettings: {
      findUnique: jest.fn(),
    },
    workRecord: {
      findMany: jest.fn(),
    },
    wbsAssignee: {
      findMany: jest.fn(),
    },
    wbsTask: {
      findMany: jest.fn(),
    },
    taskProgressSnapshot: {
      findMany: jest.fn(),
      update: jest.fn(),
    },
  },
}));

describe('WbsEvmRepository', () => {
  const prismaMock = prisma as jest.Mocked<typeof prisma>;
  const wbsId = 1;

  let repository: WbsEvmRepository;
  let mockQueryRepository: jest.Mocked<IWbsQueryRepository>;

  const makeTaskData = (overrides: Partial<WbsTaskData> = {}): WbsTaskData => ({
    id: '10',
    no: 'D1-0001',
    name: 'テストタスク',
    kijunKosu: 100,
    yoteiKosu: 120,
    jissekiKosu: null,
    kijunStart: new Date('2025-05-01'),
    kijunEnd: new Date('2025-05-31'),
    yoteiStart: new Date('2025-06-01'),
    yoteiEnd: new Date('2025-06-30'),
    jissekiStart: null,
    jissekiEnd: null,
    progressRate: 50,
    status: 'IN_PROGRESS',
    phase: null,
    assignee: null,
    ...overrides,
  });

  beforeEach(() => {
    jest.clearAllMocks();

    mockQueryRepository = {
      getWbsTasks: jest.fn(),
      getPhases: jest.fn(),
      getTaskActualHoursByMonth: jest.fn(),
      getUnlinkedWorkRecordsCount: jest.fn(),
    } as jest.Mocked<IWbsQueryRepository>;

    repository = new WbsEvmRepository(mockQueryRepository);

    (prismaMock.wbs.findUnique as jest.Mock).mockResolvedValue({
      id: wbsId,
      projectId: 'proj-1',
      project: { name: 'テストプロジェクト' },
      assignees: [],
    });
    (prismaMock.wbsBuffer.findMany as jest.Mock).mockResolvedValue([]);
    (prismaMock.projectSettings.findUnique as jest.Mock).mockResolvedValue(null);
  });

  describe('getWbsEvmData: 基準（KIJUN）未設定タスクのフォールバック', () => {
    it('KIJUNが無いタスクは予定工数をベースラインとして扱う（BACから漏れない）', async () => {
      mockQueryRepository.getWbsTasks.mockResolvedValue([
        makeTaskData({
          kijunKosu: null,
          kijunStart: null,
          kijunEnd: null,
          yoteiKosu: 30,
        }),
      ]);

      const result = await repository.getWbsEvmData(wbsId, new Date('2025-06-15'));

      expect(result.tasks).toHaveLength(1);
      expect(result.tasks[0].baseManHours).toBe(30);
      expect(result.totalBaseManHours).toBe(30);
    });

    it('KIJUNが無いタスクの基準日付は予定日付にフォールバックする（PV_BASEが期間前から全額計上されない）', async () => {
      const yoteiStart = new Date('2025-06-01');
      const yoteiEnd = new Date('2025-06-30');
      mockQueryRepository.getWbsTasks.mockResolvedValue([
        makeTaskData({
          kijunKosu: null,
          kijunStart: null,
          kijunEnd: null,
          yoteiKosu: 30,
          yoteiStart,
          yoteiEnd,
        }),
      ]);

      const result = await repository.getWbsEvmData(wbsId, new Date('2025-06-15'));

      expect(result.tasks[0].baseStartDate).toEqual(yoteiStart);
      expect(result.tasks[0].baseEndDate).toEqual(yoteiEnd);
      // 予定期間開始前のPV_BASEは0であること（従来はnull基準日により全額計上されていた）
      expect(
        result.tasks[0].getPlannedValueAtDate('BASE', new Date('2025-05-01'))
      ).toBe(0);
    });

    it('KIJUNがあるタスクは基準値をそのまま使う（回帰確認）', async () => {
      mockQueryRepository.getWbsTasks.mockResolvedValue([makeTaskData()]);

      const result = await repository.getWbsEvmData(wbsId, new Date('2025-06-15'));

      expect(result.tasks[0].baseManHours).toBe(100);
      expect(result.tasks[0].plannedManHours).toBe(120);
      expect(result.tasks[0].baseStartDate).toEqual(new Date('2025-05-01'));
      expect(result.totalBaseManHours).toBe(100);
    });
  });

  describe('getActualCostByDate: タスク未紐付け実績の取り込み', () => {
    it('タスク経由（task.wbsId）とwbsId直接紐付けの両方を対象に検索する', async () => {
      (prismaMock.workRecord.findMany as jest.Mock).mockResolvedValue([]);

      await repository.getActualCostByDate(
        wbsId,
        new Date(0),
        new Date('2025-06-30'),
        'hours'
      );

      expect(prismaMock.workRecord.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([{ task: { wbsId } }, { wbsId }]),
          }),
        })
      );
    });

    it('taskId=nullの実績（Geppo未マッチ・タスク物理削除後）も集計に含まれる', async () => {
      (prismaMock.workRecord.findMany as jest.Mock).mockResolvedValue([
        {
          id: 1,
          userId: 'user-1',
          taskId: 5,
          wbsId,
          date: new Date('2025-06-10T00:00:00.000Z'),
          hours_worked: 8,
        },
        {
          id: 2,
          userId: 'user-1',
          taskId: null,
          wbsId,
          date: new Date('2025-06-10T00:00:00.000Z'),
          hours_worked: 4,
        },
      ]);

      const result = await repository.getActualCostByDate(
        wbsId,
        new Date(0),
        new Date('2025-06-30'),
        'hours'
      );

      expect(result.get('2025-06-10')).toBe(12);
    });
  });
});
