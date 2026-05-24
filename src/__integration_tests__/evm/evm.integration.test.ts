import { container } from '@/lib/inversify.config';
import { SYMBOL } from '@/types/symbol';
import { EvmService } from '@/applications/evm/evm-service';
import { IWbsEvmRepository } from '@/applications/evm/iwbs-evm-repository';
import { cleanupTestData, seedTestProject, testIds } from '../helpers';

/**
 * テストローカルのID管理
 */
const localIds = {
  user1Id: 'evm-integration-user-001',
  user2Id: 'evm-integration-user-002',
  assignee1Id: 0,
  assignee2Id: 0,
  taskIds: [] as number[],
  bufferIds: [] as number[],
  workRecordIds: [] as number[],
  settingsCreated: false,
};

describe('EVM Integration Tests', () => {
  let evmService: EvmService;
  let wbsEvmRepository: IWbsEvmRepository;

  beforeAll(async () => {
    evmService = container.get<EvmService>(SYMBOL.EvmService);
    wbsEvmRepository = container.get<IWbsEvmRepository>(SYMBOL.IWbsEvmRepository);

    // ユーザー作成
    await global.prisma.users.upsert({
      where: { id: localIds.user1Id },
      update: {},
      create: { id: localIds.user1Id, email: 'evm-user001@example.com', name: '山田太郎', displayName: '山田太郎' },
    });
    await global.prisma.users.upsert({
      where: { id: localIds.user2Id },
      update: {},
      create: { id: localIds.user2Id, email: 'evm-user002@example.com', name: '田中花子', displayName: '田中花子' },
    });

    // プロジェクト/WBS/フェーズ作成
    await seedTestProject(global.prisma);

    // 担当者作成
    const assignee1 = await global.prisma.wbsAssignee.create({
      data: {
        wbsId: testIds.wbsId,
        assigneeId: localIds.user1Id,
        rate: 1.0,
        costPerHour: 5000,
        seq: 1,
      },
    });
    const assignee2 = await global.prisma.wbsAssignee.create({
      data: {
        wbsId: testIds.wbsId,
        assigneeId: localIds.user2Id,
        rate: 0.8,
        costPerHour: 8000,
        seq: 2,
      },
    });
    localIds.assignee1Id = assignee1.id;
    localIds.assignee2Id = assignee2.id;

    // タスク作成: 完了タスク
    const task1 = await global.prisma.wbsTask.create({
      data: {
        taskNo: 'EVM-001',
        wbsId: testIds.wbsId,
        phaseId: testIds.phaseId,
        name: '設計タスク',
        assigneeId: assignee1.id,
        status: 'COMPLETED',
        progressRate: 100,
        periods: {
          create: [
            {
              startDate: new Date('2025-04-01'),
              endDate: new Date('2025-04-10'),
              type: 'KIJUN',
              kosus: { create: [{ wbsId: testIds.wbsId, kosu: 40, type: 'NORMAL' }] },
            },
            {
              startDate: new Date('2025-04-01'),
              endDate: new Date('2025-04-10'),
              type: 'YOTEI',
              kosus: { create: [{ wbsId: testIds.wbsId, kosu: 40, type: 'NORMAL' }] },
            },
          ],
        },
      },
    });
    localIds.taskIds.push(task1.id);

    // タスク作成: 進行中タスク
    const task2 = await global.prisma.wbsTask.create({
      data: {
        taskNo: 'EVM-002',
        wbsId: testIds.wbsId,
        phaseId: testIds.phaseId,
        name: '実装タスク',
        assigneeId: assignee2.id,
        status: 'IN_PROGRESS',
        progressRate: 50,
        periods: {
          create: [
            {
              startDate: new Date('2025-04-05'),
              endDate: new Date('2025-04-20'),
              type: 'KIJUN',
              kosus: { create: [{ wbsId: testIds.wbsId, kosu: 80, type: 'NORMAL' }] },
            },
            {
              startDate: new Date('2025-04-05'),
              endDate: new Date('2025-04-25'),
              type: 'YOTEI',
              kosus: { create: [{ wbsId: testIds.wbsId, kosu: 100, type: 'NORMAL' }] },
            },
          ],
        },
      },
    });
    localIds.taskIds.push(task2.id);

    // タスク作成: 未着手タスク
    const task3 = await global.prisma.wbsTask.create({
      data: {
        taskNo: 'EVM-003',
        wbsId: testIds.wbsId,
        phaseId: testIds.phaseId,
        name: 'テストタスク',
        assigneeId: assignee1.id,
        status: 'NOT_STARTED',
        progressRate: 0,
        periods: {
          create: [
            {
              startDate: new Date('2025-04-15'),
              endDate: new Date('2025-04-30'),
              type: 'KIJUN',
              kosus: { create: [{ wbsId: testIds.wbsId, kosu: 60, type: 'NORMAL' }] },
            },
            {
              startDate: new Date('2025-04-20'),
              endDate: new Date('2025-05-05'),
              type: 'YOTEI',
              kosus: { create: [{ wbsId: testIds.wbsId, kosu: 60, type: 'NORMAL' }] },
            },
          ],
        },
      },
    });
    localIds.taskIds.push(task3.id);

    // バッファ作成
    const buffer = await global.prisma.wbsBuffer.create({
      data: {
        wbsId: testIds.wbsId,
        name: 'マネジメントバッファ',
        buffer: 20,
        bufferType: 'OTHER',
      },
    });
    localIds.bufferIds.push(buffer.id);

    // 作業記録作成（AC計算用）
    const wr1 = await global.prisma.workRecord.create({
      data: {
        userId: localIds.user1Id,
        taskId: task1.id,
        date: new Date('2025-04-03'),
        hours_worked: 8,
      },
    });
    const wr2 = await global.prisma.workRecord.create({
      data: {
        userId: localIds.user1Id,
        taskId: task1.id,
        date: new Date('2025-04-04'),
        hours_worked: 7.5,
      },
    });
    const wr3 = await global.prisma.workRecord.create({
      data: {
        userId: localIds.user2Id,
        taskId: task2.id,
        date: new Date('2025-04-10'),
        hours_worked: 6,
      },
    });
    localIds.workRecordIds.push(wr1.id, wr2.id, wr3.id);
  });

  afterAll(async () => {
    // テストデータクリーンアップ（逆順）
    if (localIds.workRecordIds.length > 0) {
      await global.prisma.workRecord.deleteMany({
        where: { id: { in: localIds.workRecordIds } },
      });
    }
    if (localIds.bufferIds.length > 0) {
      await global.prisma.wbsBuffer.deleteMany({
        where: { id: { in: localIds.bufferIds } },
      });
    }
    if (localIds.settingsCreated) {
      await global.prisma.projectSettings.delete({
        where: { projectId: testIds.projectId },
      }).catch(() => {});
    }
    if (localIds.taskIds.length > 0) {
      await global.prisma.wbsTask.deleteMany({
        where: { id: { in: localIds.taskIds } },
      });
    }
    if (localIds.assignee1Id || localIds.assignee2Id) {
      await global.prisma.wbsAssignee.deleteMany({
        where: { id: { in: [localIds.assignee1Id, localIds.assignee2Id].filter(Boolean) } },
      });
    }

    await cleanupTestData(global.prisma);

    await global.prisma.users.deleteMany({
      where: { id: { in: [localIds.user1Id, localIds.user2Id] } },
    });
  });

  describe('WbsEvmRepository', () => {
    it('getWbsEvmData でWBS全体のEVMデータを取得できる', async () => {
      const result = await wbsEvmRepository.getWbsEvmData(testIds.wbsId, new Date('2025-04-15'));

      expect(result.wbsId).toBe(testIds.wbsId);
      expect(result.tasks.length).toBeGreaterThanOrEqual(3);
      expect(result.totalPlannedManHours).toBeGreaterThanOrEqual(200); // 40+100+60

      // タスクデータの検証
      const task1 = result.tasks.find(t => t.taskNo === 'EVM-001');
      expect(task1).toBeDefined();
      expect(task1!.taskName).toBe('設計タスク');
      expect(task1!.status).toBe('COMPLETED');
      expect(task1!.plannedManHours).toBe(40);
      expect(task1!.baseManHours).toBe(40);
      expect(task1!.costPerHour).toBe(5000);

      const task2 = result.tasks.find(t => t.taskNo === 'EVM-002');
      expect(task2).toBeDefined();
      expect(task2!.taskName).toBe('実装タスク');
      expect(task2!.status).toBe('IN_PROGRESS');
      expect(task2!.plannedManHours).toBe(100);
      expect(task2!.baseManHours).toBe(80);
      expect(task2!.costPerHour).toBe(8000);
    });

    it('getBuffers でバッファ情報を取得できる', async () => {
      const buffers = await wbsEvmRepository.getBuffers(testIds.wbsId);

      expect(buffers.length).toBeGreaterThanOrEqual(1);
      const buffer = buffers.find(b => b.name === 'マネジメントバッファ');
      expect(buffer).toBeDefined();
      expect(buffer!.bufferHours).toBe(20);
    });

    it('getActualCostByDate で工数ベースの実績コストを取得できる', async () => {
      const costMap = await wbsEvmRepository.getActualCostByDate(
        testIds.wbsId,
        new Date('2025-04-01'),
        new Date('2025-04-30'),
        'hours'
      );

      // 工数ベース: 8 + 7.5 + 6 = 21.5
      const totalCost = Array.from(costMap.values()).reduce((sum, v) => sum + v, 0);
      expect(totalCost).toBeCloseTo(21.5, 1);
    });

    it('getActualCostByDate で金額ベースの実績コストを取得できる', async () => {
      const costMap = await wbsEvmRepository.getActualCostByDate(
        testIds.wbsId,
        new Date('2025-04-01'),
        new Date('2025-04-30'),
        'cost'
      );

      // 金額ベース: 8*5000 + 7.5*5000 + 6*8000 = 40000 + 37500 + 48000 = 125500
      const totalCost = Array.from(costMap.values()).reduce((sum, v) => sum + v, 0);
      expect(totalCost).toBeCloseTo(125500, -1);
    });

    it('getActualCostByDate で期間外のレコードは含まれない', async () => {
      const costMap = await wbsEvmRepository.getActualCostByDate(
        testIds.wbsId,
        new Date('2025-05-01'),
        new Date('2025-05-31'),
        'hours'
      );

      const totalCost = Array.from(costMap.values()).reduce((sum, v) => sum + v, 0);
      expect(totalCost).toBe(0);
    });

    it('getProjectSettings でプロジェクト設定を取得できる（設定なし）', async () => {
      const settings = await wbsEvmRepository.getProjectSettings(testIds.projectId);
      expect(settings).toBeNull();
    });

    it('getProjectSettings でプロジェクト設定を取得できる（設定あり）', async () => {
      // ProjectSettings作成
      await global.prisma.projectSettings.create({
        data: {
          projectId: testIds.projectId,
          progressMeasurementMethod: 'FIFTY_FIFTY',
          forecastCalculationMethod: 'REALISTIC',
        },
      });
      localIds.settingsCreated = true;

      const settings = await wbsEvmRepository.getProjectSettings(testIds.projectId);
      expect(settings).not.toBeNull();
      expect(settings!.progressMeasurementMethod).toBe('FIFTY_FIFTY');
      expect(settings!.forecastCalculationMethod).toBe('REALISTIC');
    });

    it('getTasksEvmData でタスク別EVMデータを取得できる', async () => {
      const tasks = await wbsEvmRepository.getTasksEvmData(testIds.wbsId);

      expect(tasks.length).toBeGreaterThanOrEqual(3);
      const completedTask = tasks.find(t => t.taskNo === 'EVM-001');
      expect(completedTask).toBeDefined();
      expect(completedTask!.progressRate).toBe(100);
    });
  });

  describe('EvmService - 統合テスト', () => {
    it('calculateCurrentEvmMetrics で工数ベースのメトリクスを計算できる', async () => {
      const evaluationDate = new Date('2025-04-15');
      const result = await evmService.calculateCurrentEvmMetrics(
        testIds.wbsId, evaluationDate, 'hours'
      );

      // 基本検証: 値が正しい範囲
      expect(result.date).toEqual(evaluationDate);
      expect(result.calculationMode).toBe('hours');
      expect(result.pv).toBeGreaterThan(0);
      expect(result.ev).toBeGreaterThan(0);
      expect(result.ac).toBeGreaterThan(0);
      expect(result.bac).toBeGreaterThanOrEqual(200); // 40+100+60+20(buffer)

      // 完了タスクのEVが含まれている
      // EVM-001: 完了 → EV = 40 (SELF_REPORTED: 100%)
      // EVM-002: 進行中 50% → EV = 50
      // EVM-003: 未着手 → EV = 0
      expect(result.ev).toBeCloseTo(90, -1); // ≈ 40 + 50 + 0
    });

    it('calculateCurrentEvmMetrics で金額ベースのメトリクスを計算できる', async () => {
      const evaluationDate = new Date('2025-04-15');
      const result = await evmService.calculateCurrentEvmMetrics(
        testIds.wbsId, evaluationDate, 'cost'
      );

      expect(result.calculationMode).toBe('cost');
      expect(result.bac).toBeGreaterThan(0);

      // BAC (cost): 40*5000 + 100*8000 + 60*5000 + 20(buffer) = 200000 + 800000 + 300000 + 20 = 1300020
      expect(result.bac).toBeCloseTo(1300020, -2);
    });

    it('calculateCurrentEvmMetrics で進捗率測定方法を指定できる', async () => {
      const evaluationDate = new Date('2025-04-15');

      const selfReported = await evmService.calculateCurrentEvmMetrics(
        testIds.wbsId, evaluationDate, 'hours', 'SELF_REPORTED'
      );
      const zeroHundred = await evmService.calculateCurrentEvmMetrics(
        testIds.wbsId, evaluationDate, 'hours', 'ZERO_HUNDRED'
      );
      const fiftyFifty = await evmService.calculateCurrentEvmMetrics(
        testIds.wbsId, evaluationDate, 'hours', 'FIFTY_FIFTY'
      );

      // ZERO_HUNDRED: COMPLETEDのみ100%→EV = 40
      // FIFTY_FIFTY: COMPLETED=100%, IN_PROGRESS=50%→EV = 40 + 50 = 90
      // SELF_REPORTED: 実際のprogressRate使用→EV = 40 + 50 = 90
      expect(zeroHundred.ev).toBeLessThan(fiftyFifty.ev);
      expect(zeroHundred.progressMethod).toBe('ZERO_HUNDRED');
      expect(fiftyFifty.progressMethod).toBe('FIFTY_FIFTY');
      expect(selfReported.progressMethod).toBe('SELF_REPORTED');
    });

    it('getEvmTimeSeries で時系列データを取得できる', async () => {
      const result = await evmService.getEvmTimeSeries(
        testIds.wbsId,
        new Date('2025-04-01'),
        new Date('2025-04-15'),
        'weekly',
        'hours'
      );

      // 4/1, 4/8, 4/15 = 3データポイント
      expect(result).toHaveLength(3);
      expect(result[0].date).toEqual(new Date('2025-04-01'));
      expect(result[1].date).toEqual(new Date('2025-04-08'));
      expect(result[2].date).toEqual(new Date('2025-04-15'));

      // PVは時間経過とともに増加するはず
      expect(result[2].pv).toBeGreaterThanOrEqual(result[0].pv);
    });

    it('getEvmTimeSeries で日次データを取得できる', async () => {
      const result = await evmService.getEvmTimeSeries(
        testIds.wbsId,
        new Date('2025-04-01'),
        new Date('2025-04-05'),
        'daily',
        'hours'
      );

      expect(result).toHaveLength(5); // 4/1〜4/5
    });

    it('getTaskEvmDetails でタスク別詳細を取得できる', async () => {
      const tasks = await evmService.getTaskEvmDetails(testIds.wbsId);

      expect(tasks.length).toBeGreaterThanOrEqual(3);

      const completedTask = tasks.find(t => t.taskNo === 'EVM-001');
      expect(completedTask).toBeDefined();
      expect(completedTask!.earnedValue).toBe(40); // 40 * (100/100)

      const inProgressTask = tasks.find(t => t.taskNo === 'EVM-002');
      expect(inProgressTask).toBeDefined();
      expect(inProgressTask!.earnedValue).toBe(50); // 100 * (50/100)

      const notStartedTask = tasks.find(t => t.taskNo === 'EVM-003');
      expect(notStartedTask).toBeDefined();
      expect(notStartedTask!.earnedValue).toBe(0); // 60 * (0/100)
    });

    it('getHealthStatus で健全性を判定できる', async () => {
      const evaluationDate = new Date('2025-04-15');
      const metrics = await evmService.calculateCurrentEvmMetrics(
        testIds.wbsId, evaluationDate, 'hours'
      );

      const status = evmService.getHealthStatus(metrics);
      expect(['healthy', 'warning', 'critical']).toContain(status);
    });

    it('プロジェクト設定の進捗率測定方法が適用される', async () => {
      // ProjectSettingsが FIFTY_FIFTY に設定済み（前のテストで作成）
      const evaluationDate = new Date('2025-04-15');

      // progressMethod未指定 → プロジェクト設定から取得
      const result = await evmService.calculateCurrentEvmMetrics(
        testIds.wbsId, evaluationDate, 'hours'
      );

      expect(result.progressMethod).toBe('FIFTY_FIFTY');
    });

    it('引数の進捗率測定方法はプロジェクト設定より優先される', async () => {
      const evaluationDate = new Date('2025-04-15');

      const result = await evmService.calculateCurrentEvmMetrics(
        testIds.wbsId, evaluationDate, 'hours', 'ZERO_HUNDRED'
      );

      expect(result.progressMethod).toBe('ZERO_HUNDRED');
    });
  });
});
