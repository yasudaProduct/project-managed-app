import { GetWbsSummaryHandler } from '@/applications/wbs/query/get-wbs-summary-handler';
import { GetWbsSummaryQuery } from '@/applications/wbs/query/get-wbs-summary-query';
import { AllocationCalculationMode } from '@/applications/wbs/query/allocation-calculation-mode';
import { WbsQueryRepository } from '@/infrastructures/wbs/wbs-query-repository';
import { CompanyHolidayRepository } from '@/infrastructures/calendar/company-holiday-repository';
import { UserScheduleRepository } from '@/infrastructures/calendar/user-schedule-repository';
import { WbsAssigneeRepository } from '@/infrastructures/wbs-assignee-repository';
import { SystemSettingsRepository } from '@/infrastructures/system-settings/system-settings-repository';
import prisma from '@/lib/prisma/prisma';
import type { PrismaClient } from '@prisma/client';
import { cleanupTestData, seedTestProject, testIds } from '../../helpers';

/**
 * テストデータのIDを保持する
 */
const localIds = {
  phase2Id: 0,
  userAId: '',
  userBId: '',
  assigneeAId: 0,
  assigneeBId: 0,
  taskIds: [] as number[],
};

/**
 * テスト用ユーザーを作成する
 */
async function createUser(id: string, name: string) {
  await global.prisma.users.upsert({
    where: { id },
    update: { name, displayName: name },
    create: { id, email: `${id}@example.com`, name, displayName: name },
  });
}

/**
 * WBS担当者を作成する
 */
async function createAssignee(wbsId: number, userId: string, seq: number): Promise<number> {
  const a = await global.prisma.wbsAssignee.create({
    data: { wbsId, assigneeId: userId, seq },
  });
  return a.id;
}

/**
 * タスクを作成し、YOTEI期間・工数、KIJUN期間・工数も一緒に作成する
 */
async function createTaskWithPeriods(args: {
  wbsId: number;
  taskNo: string;
  name: string;
  phaseId: number;
  assigneeId: number | null;
  status?: string;
  progressRate?: number;
  yoteiStart: Date;
  yoteiEnd: Date;
  yoteiKosu: number;
  kijunStart?: Date;
  kijunEnd?: Date;
  kijunKosu?: number;
}): Promise<number> {
  const task = await global.prisma.wbsTask.create({
    data: {
      wbsId: args.wbsId,
      taskNo: args.taskNo,
      name: args.name,
      phaseId: args.phaseId,
      assigneeId: args.assigneeId,
      status: args.status ?? 'NOT_STARTED',
      progressRate: args.progressRate ?? 0,
    },
  });

  // YOTEI期間を作成
  const yoteiPeriod = await global.prisma.taskPeriod.create({
    data: {
      taskId: task.id,
      startDate: args.yoteiStart,
      endDate: args.yoteiEnd,
      type: 'YOTEI',
    },
  });

  // YOTEI工数を作成
  await global.prisma.taskKosu.create({
    data: {
      wbsId: args.wbsId,
      periodId: yoteiPeriod.id,
      kosu: args.yoteiKosu,
      type: 'NORMAL',
    },
  });

  // KIJUN期間・工数がある場合
  if (args.kijunStart && args.kijunEnd && args.kijunKosu !== undefined) {
    const kijunPeriod = await global.prisma.taskPeriod.create({
      data: {
        taskId: task.id,
        startDate: args.kijunStart,
        endDate: args.kijunEnd,
        type: 'KIJUN',
      },
    });

    await global.prisma.taskKosu.create({
      data: {
        wbsId: args.wbsId,
        periodId: kijunPeriod.id,
        kosu: args.kijunKosu,
        type: 'NORMAL',
      },
    });
  }

  return task.id;
}

/**
 * 作業実績を記録する
 */
async function createWorkRecord(userId: string, taskId: number, date: Date, hours: number) {
  await global.prisma.workRecord.create({
    data: { userId, taskId, date, hours_worked: hours },
  });
}

/**
 * テストデータをすべてクリーンアップする
 */
async function cleanupAll() {
  // work_records → task_kosu → task_period → wbs_task → wbs_assignee → (phase) の順に削除
  await global.prisma.workRecord.deleteMany({
    where: { task: { wbsId: testIds.wbsId } },
  }).catch(() => {});
  await global.prisma.taskKosu.deleteMany({
    where: { wbsId: testIds.wbsId },
  }).catch(() => {});
  await global.prisma.taskPeriod.deleteMany({
    where: { task: { wbsId: testIds.wbsId } },
  }).catch(() => {});
  await global.prisma.wbsTask.deleteMany({
    where: { wbsId: testIds.wbsId },
  }).catch(() => {});
  await global.prisma.wbsAssignee.deleteMany({
    where: { wbsId: testIds.wbsId },
  }).catch(() => {});
  if (localIds.phase2Id) {
    await global.prisma.wbsPhase.delete({
      where: { id: localIds.phase2Id },
    }).catch(() => {});
  }
  await global.prisma.projectSettings.deleteMany({
    where: { projectId: testIds.projectId },
  }).catch(() => {});
  await global.prisma.users.deleteMany({
    where: { id: { in: [localIds.userAId, localIds.userBId].filter(Boolean) } },
  }).catch(() => {});

  await cleanupTestData(global.prisma);
}

describe('GetWbsSummaryHandler Integration Tests', () => {
  let handler: GetWbsSummaryHandler;

  beforeAll(async () => {
    // リポジトリを実インスタンスで構築
    // CompanyHolidayRepository, UserScheduleRepository はコンストラクタで PrismaClient を受け取る
    handler = new GetWbsSummaryHandler(
      new WbsQueryRepository(),
      new CompanyHolidayRepository(prisma as unknown as PrismaClient),
      new UserScheduleRepository(prisma as unknown as PrismaClient),
      new WbsAssigneeRepository(),
      new SystemSettingsRepository(),
    );

    // 基本データ（プロジェクト、WBS、フェーズ1）
    await seedTestProject(global.prisma);

    // フェーズ2
    const phase2 = await global.prisma.wbsPhase.create({
      data: { name: '実装', code: 'IMPL', seq: 2, wbsId: testIds.wbsId },
    });
    localIds.phase2Id = phase2.id;

    // ユーザー
    localIds.userAId = `user-a-${Date.now()}`;
    localIds.userBId = `user-b-${Date.now()}`;
    await createUser(localIds.userAId, '田中太郎');
    await createUser(localIds.userBId, '佐藤花子');

    // WBS担当者
    localIds.assigneeAId = await createAssignee(testIds.wbsId, localIds.userAId, 1);
    localIds.assigneeBId = await createAssignee(testIds.wbsId, localIds.userBId, 2);

    // プロジェクト設定
    await global.prisma.projectSettings.create({
      data: {
        projectId: testIds.projectId,
        roundToQuarter: false,
        progressMeasurementMethod: 'SELF_REPORTED',
        forecastCalculationMethod: 'REALISTIC',
      },
    });
  });

  afterAll(async () => {
    await cleanupAll();
  });

  beforeEach(async () => {
    // テストごとにタスク関連データをクリーンアップ
    await global.prisma.workRecord.deleteMany({
      where: { task: { wbsId: testIds.wbsId } },
    }).catch(() => {});
    await global.prisma.taskKosu.deleteMany({
      where: { wbsId: testIds.wbsId },
    }).catch(() => {});
    await global.prisma.taskPeriod.deleteMany({
      where: { task: { wbsId: testIds.wbsId } },
    }).catch(() => {});
    await global.prisma.wbsTask.deleteMany({
      where: { wbsId: testIds.wbsId },
    }).catch(() => {});
  });

  describe('工程別・担当者別の基本集計', () => {
    it('LATERAL JOIN で取得した予定工数・実績工数が工程別・担当者別に正しく集計される', async () => {
      // テストフェーズ(seq=1): タスク1(田中, yotei=20), タスク2(佐藤, yotei=15)
      // 実装(seq=2): タスク3(田中, yotei=30)
      // work_records: タスク1に8h, タスク3に12h
      const t1 = await createTaskWithPeriods({
        wbsId: testIds.wbsId, taskNo: 'T-001', name: 'タスク1',
        phaseId: testIds.phaseId, assigneeId: localIds.assigneeAId,
        yoteiStart: new Date('2025-01-10'), yoteiEnd: new Date('2025-01-20'), yoteiKosu: 20,
      });
      await createTaskWithPeriods({
        wbsId: testIds.wbsId, taskNo: 'T-002', name: 'タスク2',
        phaseId: testIds.phaseId, assigneeId: localIds.assigneeBId,
        yoteiStart: new Date('2025-01-15'), yoteiEnd: new Date('2025-01-25'), yoteiKosu: 15,
      });
      const t3 = await createTaskWithPeriods({
        wbsId: testIds.wbsId, taskNo: 'T-003', name: 'タスク3',
        phaseId: localIds.phase2Id, assigneeId: localIds.assigneeAId,
        yoteiStart: new Date('2025-02-01'), yoteiEnd: new Date('2025-02-15'), yoteiKosu: 30,
      });

      await createWorkRecord(localIds.userAId, t1, new Date('2025-01-12'), 8);
      await createWorkRecord(localIds.userAId, t3, new Date('2025-02-05'), 12);

      const query = new GetWbsSummaryQuery(testIds.projectId, testIds.wbsId, AllocationCalculationMode.START_DATE_BASED);
      const result = await handler.execute(query);

      // 工程別集計
      expect(result.phaseSummaries).toHaveLength(2);
      const phase1 = result.phaseSummaries.find(p => p.phase === 'テストフェーズ');
      const phase2 = result.phaseSummaries.find(p => p.phase === '実装');
      expect(phase1).toBeDefined();
      expect(phase1!.taskCount).toBe(2);
      expect(phase1!.plannedHours).toBe(35); // 20 + 15
      expect(phase1!.actualHours).toBe(8);
      expect(phase2).toBeDefined();
      expect(phase2!.taskCount).toBe(1);
      expect(phase2!.plannedHours).toBe(30);
      expect(phase2!.actualHours).toBe(12);

      // 工程別合計
      expect(result.phaseTotal.taskCount).toBe(3);
      expect(result.phaseTotal.plannedHours).toBe(65);
      expect(result.phaseTotal.actualHours).toBe(20);

      // 担当者別集計
      const assigneeA = result.assigneeSummaries.find(a => a.assignee === '田中太郎');
      const assigneeB = result.assigneeSummaries.find(a => a.assignee === '佐藤花子');
      expect(assigneeA).toBeDefined();
      expect(assigneeA!.taskCount).toBe(2); // T-001, T-003
      expect(assigneeA!.plannedHours).toBe(50); // 20 + 30
      expect(assigneeA!.actualHours).toBe(20); // 8 + 12
      expect(assigneeB).toBeDefined();
      expect(assigneeB!.taskCount).toBe(1);
      expect(assigneeB!.plannedHours).toBe(15);
      expect(assigneeB!.actualHours).toBe(0);

      // 担当者のseq順ソート
      expect(result.assigneeSummaries[0].assignee).toBe('田中太郎');
      expect(result.assigneeSummaries[1].assignee).toBe('佐藤花子');
    });
  });

  describe('月別集計 (START_DATE_BASED)', () => {
    it('予定工数が開始月に集計され、実績がwork_recordsの月に集計される', async () => {
      // タスク1: 予定開始=2025/01, yotei=20h
      // work_records: 2025/01に5h, 2025/02に3h（予定外月）
      const t1 = await createTaskWithPeriods({
        wbsId: testIds.wbsId, taskNo: 'T-010', name: '月別テスト',
        phaseId: testIds.phaseId, assigneeId: localIds.assigneeAId,
        yoteiStart: new Date('2025-01-10'), yoteiEnd: new Date('2025-01-20'), yoteiKosu: 20,
      });

      await createWorkRecord(localIds.userAId, t1, new Date('2025-01-15'), 5);
      await createWorkRecord(localIds.userAId, t1, new Date('2025-02-03'), 3);

      const query = new GetWbsSummaryQuery(testIds.projectId, testIds.wbsId, AllocationCalculationMode.START_DATE_BASED);
      const result = await handler.execute(query);

      // 月別・担当者別
      const jan = result.monthlyAssigneeSummary.data.find(
        d => d.assignee === '田中太郎' && d.month === '2025/01'
      );
      expect(jan).toBeDefined();
      expect(jan!.plannedHours).toBe(20);
      expect(jan!.actualHours).toBe(5);

      // 予定外月の2月にも実績が表示される
      const feb = result.monthlyAssigneeSummary.data.find(
        d => d.assignee === '田中太郎' && d.month === '2025/02'
      );
      expect(feb).toBeDefined();
      expect(feb!.plannedHours).toBe(0);
      expect(feb!.actualHours).toBe(3);

      // grandTotal
      expect(result.monthlyAssigneeSummary.grandTotal.plannedHours).toBe(20);
      expect(result.monthlyAssigneeSummary.grandTotal.actualHours).toBe(8);

      // 月別・工程別も検証
      expect(result.monthlyPhaseSummary).toBeDefined();
      expect(result.monthlyPhaseSummary!.grandTotal.plannedHours).toBe(20);
      expect(result.monthlyPhaseSummary!.grandTotal.actualHours).toBe(8);
    });
  });

  describe('予定担当者 ≠ 実作業者', () => {
    it('予定はタスク担当者に、実績はwork_recordsの実作業者に分離して集計される', async () => {
      // タスク: 担当者=田中, yotei=30h
      // work_records: 佐藤が2025/01に10h作業
      const t1 = await createTaskWithPeriods({
        wbsId: testIds.wbsId, taskNo: 'T-020', name: '担当者分離テスト',
        phaseId: testIds.phaseId, assigneeId: localIds.assigneeAId,
        yoteiStart: new Date('2025-01-10'), yoteiEnd: new Date('2025-01-20'), yoteiKosu: 30,
      });

      // 佐藤が作業（タスク担当者は田中）
      await createWorkRecord(localIds.userBId, t1, new Date('2025-01-15'), 10);

      const query = new GetWbsSummaryQuery(testIds.projectId, testIds.wbsId, AllocationCalculationMode.START_DATE_BASED);
      const result = await handler.execute(query);

      // 月別・担当者別: 田中に予定30h、佐藤に実績10h
      const tanaka = result.monthlyAssigneeSummary.data.find(
        d => d.assignee === '田中太郎' && d.month === '2025/01'
      );
      const sato = result.monthlyAssigneeSummary.data.find(
        d => d.assignee === '佐藤花子' && d.month === '2025/01'
      );

      expect(tanaka).toBeDefined();
      expect(tanaka!.plannedHours).toBe(30);
      expect(tanaka!.actualHours).toBe(0); // 田中自身は作業していない

      expect(sato).toBeDefined();
      expect(sato!.plannedHours).toBe(0);
      expect(sato!.actualHours).toBe(10); // 佐藤が実際に作業した
    });
  });

  describe('月別集計 (BUSINESS_DAY_ALLOCATION)', () => {
    it('月跨ぎタスクの予定工数が営業日按分で複数月に分散される', async () => {
      // タスク: 2025/01/15〜2025/02/14, yotei=40h
      await createTaskWithPeriods({
        wbsId: testIds.wbsId, taskNo: 'T-030', name: '月跨ぎ按分テスト',
        phaseId: testIds.phaseId, assigneeId: localIds.assigneeAId,
        yoteiStart: new Date('2025-01-15'), yoteiEnd: new Date('2025-02-14'), yoteiKosu: 40,
      });

      const query = new GetWbsSummaryQuery(testIds.projectId, testIds.wbsId, AllocationCalculationMode.BUSINESS_DAY_ALLOCATION);
      const result = await handler.execute(query);

      // 2月にまたがって分散
      const months = result.monthlyAssigneeSummary.months;
      expect(months).toContain('2025/01');
      expect(months).toContain('2025/02');

      // 各月に0より大きい値が配分される
      const jan = result.monthlyAssigneeSummary.data.find(
        d => d.assignee === '田中太郎' && d.month === '2025/01'
      );
      const feb = result.monthlyAssigneeSummary.data.find(
        d => d.assignee === '田中太郎' && d.month === '2025/02'
      );
      expect(jan!.plannedHours).toBeGreaterThan(0);
      expect(jan!.plannedHours).toBeLessThan(40);
      expect(feb!.plannedHours).toBeGreaterThan(0);
      expect(feb!.plannedHours).toBeLessThan(40);

      // 合計が元の yoteiKosu と一致
      expect(result.monthlyAssigneeSummary.grandTotal.plannedHours).toBeCloseTo(40, 0);

      // 月別・工程別も同様に分散
      expect(result.monthlyPhaseSummary).toBeDefined();
      expect(result.monthlyPhaseSummary!.grandTotal.plannedHours).toBeCloseTo(40, 0);
    });
  });

  describe('baselineHours（kijunKosu）の反映', () => {
    it('KIJUN期間・工数が baselineHours として月別集計に反映される', async () => {
      await createTaskWithPeriods({
        wbsId: testIds.wbsId, taskNo: 'T-040', name: '基準工数テスト',
        phaseId: testIds.phaseId, assigneeId: localIds.assigneeAId,
        yoteiStart: new Date('2025-03-01'), yoteiEnd: new Date('2025-03-15'), yoteiKosu: 20,
        kijunStart: new Date('2025-03-01'), kijunEnd: new Date('2025-03-15'), kijunKosu: 50,
      });

      const query = new GetWbsSummaryQuery(testIds.projectId, testIds.wbsId, AllocationCalculationMode.START_DATE_BASED);
      const result = await handler.execute(query);

      // baselineHours が集計に反映
      expect(result.monthlyAssigneeSummary.grandTotal.baselineHours).toBe(50);
      expect(result.monthlyPhaseSummary!.grandTotal.baselineHours).toBe(50);
    });

    it('kijunKosu が未設定の場合 baselineHours は 0', async () => {
      await createTaskWithPeriods({
        wbsId: testIds.wbsId, taskNo: 'T-041', name: '基準工数なし',
        phaseId: testIds.phaseId, assigneeId: localIds.assigneeAId,
        yoteiStart: new Date('2025-03-01'), yoteiEnd: new Date('2025-03-15'), yoteiKosu: 20,
      });

      const query = new GetWbsSummaryQuery(testIds.projectId, testIds.wbsId, AllocationCalculationMode.START_DATE_BASED);
      const result = await handler.execute(query);

      expect(result.monthlyAssigneeSummary.grandTotal.baselineHours).toBe(0);
      expect(result.monthlyPhaseSummary!.grandTotal.baselineHours).toBe(0);
    });
  });

  describe('複数工程・複数月・複数担当者の複合ケース', () => {
    it('工程別・担当者別・月別の集計が全て正確に計算される', async () => {
      // テストフェーズ: タスク1(田中, 2025/01, 10h), タスク2(佐藤, 2025/01, 15h)
      // 実装: タスク3(田中, 2025/02, 25h)
      // work_records: タスク1に田中4h(01月), タスク2に佐藤6h(01月), タスク3に田中10h(02月)
      const t1 = await createTaskWithPeriods({
        wbsId: testIds.wbsId, taskNo: 'T-050', name: '複合テスト1',
        phaseId: testIds.phaseId, assigneeId: localIds.assigneeAId,
        yoteiStart: new Date('2025-01-10'), yoteiEnd: new Date('2025-01-20'), yoteiKosu: 10,
      });
      const t2 = await createTaskWithPeriods({
        wbsId: testIds.wbsId, taskNo: 'T-051', name: '複合テスト2',
        phaseId: testIds.phaseId, assigneeId: localIds.assigneeBId,
        yoteiStart: new Date('2025-01-15'), yoteiEnd: new Date('2025-01-25'), yoteiKosu: 15,
      });
      const t3 = await createTaskWithPeriods({
        wbsId: testIds.wbsId, taskNo: 'T-052', name: '複合テスト3',
        phaseId: localIds.phase2Id, assigneeId: localIds.assigneeAId,
        yoteiStart: new Date('2025-02-01'), yoteiEnd: new Date('2025-02-10'), yoteiKosu: 25,
      });

      await createWorkRecord(localIds.userAId, t1, new Date('2025-01-12'), 4);
      await createWorkRecord(localIds.userBId, t2, new Date('2025-01-18'), 6);
      await createWorkRecord(localIds.userAId, t3, new Date('2025-02-05'), 10);

      const query = new GetWbsSummaryQuery(testIds.projectId, testIds.wbsId, AllocationCalculationMode.START_DATE_BASED);
      const result = await handler.execute(query);

      // 月別合計の検証
      const janTotal = result.monthlyAssigneeSummary.monthlyTotals['2025/01'];
      const febTotal = result.monthlyAssigneeSummary.monthlyTotals['2025/02'];
      expect(janTotal.plannedHours).toBe(25); // 10 + 15
      expect(janTotal.actualHours).toBe(10); // 4 + 6
      expect(febTotal.plannedHours).toBe(25);
      expect(febTotal.actualHours).toBe(10);

      // 担当者別合計の検証
      const tanakaTotal = result.monthlyAssigneeSummary.assigneeTotals['田中太郎'];
      const satoTotal = result.monthlyAssigneeSummary.assigneeTotals['佐藤花子'];
      expect(tanakaTotal.plannedHours).toBe(35); // 10 + 25
      expect(tanakaTotal.actualHours).toBe(14); // 4 + 10
      expect(satoTotal.plannedHours).toBe(15);
      expect(satoTotal.actualHours).toBe(6);

      // 全体合計
      expect(result.monthlyAssigneeSummary.grandTotal.taskCount).toBe(3);
      expect(result.monthlyAssigneeSummary.grandTotal.plannedHours).toBe(50);
      expect(result.monthlyAssigneeSummary.grandTotal.actualHours).toBe(20);

      // 月別・工程別: テストフェーズ(01月) = planned 25, 実装(02月) = planned 25
      const phaseJan = result.monthlyPhaseSummary!.data.find(
        d => d.phase === 'テストフェーズ' && d.month === '2025/01'
      );
      const phaseImplFeb = result.monthlyPhaseSummary!.data.find(
        d => d.phase === '実装' && d.month === '2025/02'
      );
      expect(phaseJan!.plannedHours).toBe(25);
      expect(phaseJan!.actualHours).toBe(10);
      expect(phaseImplFeb!.plannedHours).toBe(25);
      expect(phaseImplFeb!.actualHours).toBe(10);
    });
  });
});
