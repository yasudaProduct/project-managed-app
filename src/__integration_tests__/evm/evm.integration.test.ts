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
      expect(settings!.evmForecastMethod).toBe('CPI_ONLY'); // デフォルト値
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

      // BAC (cost) はベース工数(kijun)で計算する: 40*5000 + 80*8000 + 60*5000 + 20(buffer) = 200000 + 640000 + 300000 + 20 = 1140020
      expect(result.bac).toBeCloseTo(1140020, -2);
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

  describe('EvmService - 予測計算ロジック統合テスト', () => {
    it('予測モード有効で計算式通りの値が返される', async () => {
      // 2025-04-12を「現在」として固定（タスク期間の途中）
      const fakeNow = new Date('2025-04-12T00:00:00.000Z');
      jest.useFakeTimers({ doNotFake: ['setTimeout', 'setInterval', 'setImmediate', 'clearTimeout', 'clearInterval', 'clearImmediate', 'nextTick'] });
      jest.setSystemTime(fakeNow);

      try {
        // 「現在」のメトリクスを取得（予測計算のベースライン）
        const currentMetrics = await evmService.calculateCurrentEvmMetrics(
          testIds.wbsId, fakeNow, 'hours', 'SELF_REPORTED'
        );

        // 予測モードで時系列データを取得
        const startDate = new Date('2025-04-12T00:00:00.000Z');
        const endDate = new Date('2025-04-26T00:00:00.000Z');
        const result = await evmService.getEvmTimeSeries(
          testIds.wbsId, startDate, endDate, 'weekly', 'hours', 'SELF_REPORTED', true
        );

        // 過去・現在のデータポイントはisPredicted=false
        const pastMetrics = result.filter(m => m.date.getTime() <= fakeNow.getTime());
        pastMetrics.forEach(m => expect(m.isPredicted).toBe(false));

        // 未来のデータポイントはisPredicted=true
        const futureMetrics = result.filter(m => m.date.getTime() > fakeNow.getTime());
        expect(futureMetrics.length).toBeGreaterThan(0);
        futureMetrics.forEach(m => expect(m.isPredicted).toBe(true));

        // 予測値が計算式に従っているか検証
        for (const fm of futureMetrics) {
          // EV <= BAC
          expect(fm.ev).toBeLessThanOrEqual(fm.bac);

          // 予測EVの計算式を検証
          // predictedEV = min(BAC, currentEV + max(0, futurePV - currentPV) * SPI)
          const spi = currentMetrics.spi;
          const pvIncrement = Math.max(0, fm.pv - currentMetrics.pv);
          const expectedEv = Math.min(
            currentMetrics.bac,
            currentMetrics.ev + pvIncrement * spi
          );
          expect(fm.ev).toBeCloseTo(expectedEv, 5);

          // 予測ACの計算式を検証
          // predictedAC = currentAC + evIncrement / effectiveCPI
          const cpi = currentMetrics.cpi;
          const effectiveCpi = cpi === 0 ? 1 : cpi;
          const evIncrement = Math.max(0, fm.ev - currentMetrics.ev);
          const expectedAc = currentMetrics.ac + evIncrement / effectiveCpi;
          expect(fm.ac).toBeCloseTo(expectedAc, 5);

          // PVはbaseMetricのものを使用（予測値ではない）
          expect(fm.pv).toBeGreaterThanOrEqual(0);
        }
      } finally {
        jest.useRealTimers();
      }
    });

    it('SPI/CPIが極端な値でも予測計算が破綻しない', async () => {
      // 全タスク完了のWBSでテスト（SPI/CPIが極端になりうる）
      // 2025-04-02を「現在」として固定（タスク開始直後）
      const fakeNow = new Date('2025-04-02T00:00:00.000Z');
      jest.useFakeTimers({ doNotFake: ['setTimeout', 'setInterval', 'setImmediate', 'clearTimeout', 'clearInterval', 'clearImmediate', 'nextTick'] });
      jest.setSystemTime(fakeNow);

      try {
        const startDate = new Date('2025-04-02T00:00:00.000Z');
        const endDate = new Date('2025-05-10T00:00:00.000Z');

        const result = await evmService.getEvmTimeSeries(
          testIds.wbsId, startDate, endDate, 'weekly', 'hours', 'SELF_REPORTED', true
        );

        expect(result.length).toBeGreaterThan(0);

        for (const m of result) {
          // 値がNaN/Infinityにならないことを検証
          expect(Number.isFinite(m.pv)).toBe(true);
          expect(Number.isFinite(m.ev)).toBe(true);
          expect(Number.isFinite(m.ac)).toBe(true);
          expect(Number.isFinite(m.bac)).toBe(true);

          // EVはBACを超えない
          expect(m.ev).toBeLessThanOrEqual(m.bac + 0.01); // 浮動小数点誤差許容

          // ACは0以上
          expect(m.ac).toBeGreaterThanOrEqual(0);

          // 予測フラグの整合性
          if (m.date.getTime() > fakeNow.getTime()) {
            expect(m.isPredicted).toBe(true);
          } else {
            expect(m.isPredicted).toBe(false);
          }
        }
      } finally {
        jest.useRealTimers();
      }
    });

    it('forecastMethod CPI_SPI でEAC/ETCがCPI×SPIベースで計算される', async () => {
      // ProjectSettingsにCPI_SPIを設定
      await global.prisma.projectSettings.upsert({
        where: { projectId: testIds.projectId },
        create: {
          projectId: testIds.projectId,
          evmForecastMethod: 'CPI_SPI',
        },
        update: {
          evmForecastMethod: 'CPI_SPI',
        },
      });

      const evaluationDate = new Date('2025-04-15');
      const result = await evmService.calculateCurrentEvmMetrics(
        testIds.wbsId, evaluationDate, 'hours'
      );

      expect(result.forecastMethod).toBe('CPI_SPI');
      if (result.cpi > 0 && result.spi > 0) {
        const expectedEtc = (result.bac - result.ev) / (result.cpi * result.spi);
        expect(result.etc).toBeCloseTo(expectedEtc, 1);
      }
      expect(result.eac).toBeCloseTo(result.ac + result.etc, 1);
    });

    it('forecastMethod PLANNED でETC = BAC - EV となる', async () => {
      await global.prisma.projectSettings.upsert({
        where: { projectId: testIds.projectId },
        create: {
          projectId: testIds.projectId,
          evmForecastMethod: 'PLANNED',
        },
        update: {
          evmForecastMethod: 'PLANNED',
        },
      });

      const evaluationDate = new Date('2025-04-15');
      const result = await evmService.calculateCurrentEvmMetrics(
        testIds.wbsId, evaluationDate, 'hours'
      );

      expect(result.forecastMethod).toBe('PLANNED');
      expect(result.etc).toBeCloseTo(result.bac - result.ev, 1);
      expect(result.eac).toBeCloseTo(result.ac + result.etc, 1);
    });

    it('引数のforecastMethodがProjectSettings設定をオーバーライドする', async () => {
      // 設定はCPI_SPI
      await global.prisma.projectSettings.upsert({
        where: { projectId: testIds.projectId },
        create: {
          projectId: testIds.projectId,
          evmForecastMethod: 'CPI_SPI',
        },
        update: {
          evmForecastMethod: 'CPI_SPI',
        },
      });

      const evaluationDate = new Date('2025-04-15');
      // 引数でPLANNEDを指定
      const result = await evmService.calculateCurrentEvmMetrics(
        testIds.wbsId, evaluationDate, 'hours', undefined, 'PLANNED'
      );

      expect(result.forecastMethod).toBe('PLANNED');
      expect(result.etc).toBeCloseTo(result.bac - result.ev, 1);
    });
  });

  describe('getProgressSnapshots（2B読み出し）', () => {
    let syncLogId: number;
    let taskId: number;
    let taskNo: string;

    beforeAll(async () => {
      const t = await global.prisma.wbsTask.findFirst({ where: { wbsId: testIds.wbsId } });
      taskId = t!.id;
      taskNo = t!.taskNo;
      const log = await global.prisma.syncLog.create({
        data: {
          projectId: testIds.projectId,
          syncStatus: 'SUCCESS',
          syncedAt: new Date(),
          recordCount: 0,
          addedCount: 0,
          updatedCount: 0,
          deletedCount: 0,
        },
      });
      syncLogId = log.id;
      await global.prisma.taskProgressSnapshot.createMany({
        data: [
          {
            taskId, wbsId: testIds.wbsId, taskNo,
            snapshotAt: new Date('2025-03-01T10:00:00Z'),
            progressRate: 50, status: 'IN_PROGRESS',
            plannedManHours: 100, baseManHours: 100, costPerHour: 5000,
            isRemoved: false, syncLogId,
          },
          {
            taskId, wbsId: testIds.wbsId, taskNo,
            snapshotAt: new Date('2025-02-01T10:00:00Z'),
            progressRate: 20, status: 'IN_PROGRESS',
            plannedManHours: 100, baseManHours: 100, costPerHour: 5000,
            isRemoved: false, syncLogId,
          },
        ],
      });
    });

    afterAll(async () => {
      await global.prisma.taskProgressSnapshot.deleteMany({ where: { syncLogId } }).catch(() => {});
      await global.prisma.syncLog.delete({ where: { id: syncLogId } }).catch(() => {});
    });

    it('snapshotAt<=toDate を snapshotAt昇順で返し、Decimalは数値化される', async () => {
      const partial = await wbsEvmRepository.getProgressSnapshots(testIds.wbsId, new Date('2025-02-15'));
      const mine = partial.filter((r) => r.taskId === taskId);
      expect(mine).toHaveLength(1); // 2/1のみ（3/1はtoDate超過で除外）
      expect(mine[0].progressRate).toBe(20);
      expect(typeof mine[0].plannedManHours).toBe('number');
      expect(typeof mine[0].costPerHour).toBe('number');

      const all = await wbsEvmRepository.getProgressSnapshots(testIds.wbsId, new Date('2025-04-01'));
      const mineAll = all.filter((r) => r.taskId === taskId);
      expect(mineAll.map((r) => r.progressRate)).toEqual([20, 50]); // snapshotAt昇順
    });
  });

  describe('getEvmTimeSeries の as-of再構築（2B end-to-end）', () => {
    const syncLogIds: number[] = [];
    let taskIds: number[] = [];
    let taskNos: string[] = [];

    // 指定日のEVを時系列から取り出す
    const evOn = (series: { date: Date; ev: number }[], ymd: string): number => {
      const target = series.find((m) => {
        const d = m.date;
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        return key === ymd;
      });
      if (!target) throw new Error(`date not found: ${ymd}`);
      return target.ev;
    };

    beforeAll(async () => {
      // クリーンスレート（他describeのsnapshotが残っていても影響させない）
      await global.prisma.taskProgressSnapshot
        .deleteMany({ where: { wbsId: testIds.wbsId } })
        .catch(() => {});

      const tasks = await global.prisma.wbsTask.findMany({
        where: { wbsId: testIds.wbsId },
        orderBy: { taskNo: 'asc' },
      });
      taskIds = tasks.map((t) => t.id);
      taskNos = tasks.map((t) => t.taskNo);

      const log = await global.prisma.syncLog.create({
        data: {
          projectId: testIds.projectId, syncStatus: 'SUCCESS', syncedAt: new Date(),
          recordCount: 0, addedCount: 0, updatedCount: 0, deletedCount: 0,
        },
      });
      syncLogIds.push(log.id);

      // 全タスクに対し 2025-03-15 時点の進捗20%スナップショット（planned/base=100, SELF_REPORTED想定）
      await global.prisma.taskProgressSnapshot.createMany({
        data: tasks.map((t) => ({
          taskId: t.id, wbsId: testIds.wbsId, taskNo: t.taskNo,
          snapshotAt: new Date('2025-03-15T10:00:00Z'),
          progressRate: 20, status: 'IN_PROGRESS' as const,
          plannedManHours: 100, baseManHours: 100, costPerHour: 5000,
          plannedStart: new Date('2025-01-01'), plannedEnd: new Date('2025-06-30'),
          baseStart: new Date('2025-01-01'), baseEnd: new Date('2025-06-30'),
          isRemoved: false, syncLogId: log.id,
        })),
      });
    });

    afterAll(async () => {
      await global.prisma.taskProgressSnapshot
        .deleteMany({ where: { taskNo: { in: taskNos } } })
        .catch(() => {});
      if (syncLogIds.length) {
        await global.prisma.syncLog.deleteMany({ where: { id: { in: syncLogIds } } }).catch(() => {});
      }
    });

    it('過去日のEVが「現在のタスク進捗」ではなく当時のスナップショット進捗で再構築される', async () => {
      const series = await evmService.getEvmTimeSeries(
        testIds.wbsId, new Date('2025-03-20'), new Date('2025-04-05'),
        'daily', 'hours', 'SELF_REPORTED',
      );
      // 3タスク × planned100 × 20% = 60（ライブ進捗ではなくsnapshot確定値）
      expect(evOn(series, '2025-04-01')).toBeCloseTo(60, 5);
    });

    it('tombstoneスナップショット以降は当該タスクの寄与が0になる', async () => {
      // 1タスクを 2025-03-25 に論理削除（tombstone）
      const log = await global.prisma.syncLog.create({
        data: {
          projectId: testIds.projectId, syncStatus: 'SUCCESS', syncedAt: new Date(),
          recordCount: 0, addedCount: 0, updatedCount: 0, deletedCount: 0,
        },
      });
      syncLogIds.push(log.id);
      await global.prisma.taskProgressSnapshot.create({
        data: {
          taskId: taskIds[0], wbsId: testIds.wbsId, taskNo: taskNos[0],
          snapshotAt: new Date('2025-03-25T10:00:00Z'),
          progressRate: null, status: 'IN_PROGRESS',
          plannedManHours: 0, baseManHours: 0, costPerHour: 0,
          isRemoved: true, syncLogId: log.id,
        },
      });

      const series = await evmService.getEvmTimeSeries(
        testIds.wbsId, new Date('2025-03-20'), new Date('2025-04-05'),
        'daily', 'hours', 'SELF_REPORTED',
      );
      // tombstone前(3/20)は3タスク=60、tombstone後(4/1)は残り2タスク=40
      expect(evOn(series, '2025-03-20')).toBeCloseTo(60, 5);
      expect(evOn(series, '2025-04-01')).toBeCloseTo(40, 5);
    });
  });
});
