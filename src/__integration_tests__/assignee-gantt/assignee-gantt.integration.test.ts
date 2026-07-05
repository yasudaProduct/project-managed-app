import { container } from '@/lib/inversify.config';
import { SYMBOL } from '@/types/symbol';
import { IAssigneeGanttService } from '@/applications/assignee-gantt/iassignee-gantt.service';
import { ITaskRepository } from '@/applications/task/itask-repository';
import { IWbsAssigneeRepository } from '@/applications/wbs/iwbs-assignee-repository';
import { ICompanyHolidayRepository } from '@/applications/calendar/icompany-holiday-repository';
import { Task } from '@/domains/task/task';
import { WbsAssignee } from '@/domains/wbs/wbs-assignee';
import { TaskNo } from '@/domains/task/value-object/task-id';
import { TaskStatus } from '@/domains/task/value-object/task-status';
import { Period } from '@/domains/task/period';
import { CompanyHoliday } from '@/domains/calendar/company-calendar';
import { PeriodType } from '@/domains/task/value-object/period-type';
import { ManHour } from '@/domains/task/man-hour';
import { ManHourType } from '@/domains/task/value-object/man-hour-type';
import { cleanupTestData, seedTestProject, testIds } from '../helpers';

/**
 * テストローカルのID管理
 */
const localIds = {
  assignee1Id: 0,
  assignee2Id: 0,
  user1Id: 'assignee-gantt-user-001',
  user2Id: 'assignee-gantt-user-002',
  user3Id: 'assignee-gantt-user-003',
  taskIds: [] as number[],
  holidayIds: [] as number[],
  scheduleIds: [] as number[],
  extraAssigneeIds: [] as number[],
};

describe('AssigneeGantt Integration Tests', () => {
  let assigneeGanttService: IAssigneeGanttService;
  let taskRepository: ITaskRepository;
  let wbsAssigneeRepository: IWbsAssigneeRepository;
  let companyHolidayRepository: ICompanyHolidayRepository;

  beforeAll(async () => {
    // DIコンテナから必要なサービスを取得
    assigneeGanttService = container.get<IAssigneeGanttService>(SYMBOL.IAssigneeGanttService);
    taskRepository = container.get<ITaskRepository>(SYMBOL.ITaskRepository);
    wbsAssigneeRepository = container.get<IWbsAssigneeRepository>(SYMBOL.IWbsAssigneeRepository);
    companyHolidayRepository = container.get<ICompanyHolidayRepository>(SYMBOL.ICompanyHolidayRepository);

    // ユーザー作成（upsert）
    await global.prisma.users.upsert({
      where: { id: localIds.user1Id },
      update: {},
      create: { id: localIds.user1Id, email: 'ag-user001@example.com', name: '山田太郎', displayName: '山田太郎' },
    });
    await global.prisma.users.upsert({
      where: { id: localIds.user2Id },
      update: {},
      create: { id: localIds.user2Id, email: 'ag-user002@example.com', name: '田中花子', displayName: '田中花子' },
    });
    await global.prisma.users.upsert({
      where: { id: localIds.user3Id },
      update: {},
      create: { id: localIds.user3Id, email: 'ag-user003@example.com', name: '佐藤次郎', displayName: '佐藤次郎' },
    });

    // 共通のプロジェクト/WBS/フェーズを作成
    await seedTestProject(global.prisma);

    // 担当者作成
    const assignee1 = await wbsAssigneeRepository.create(testIds.wbsId, WbsAssignee.create({
      wbsId: testIds.wbsId,
      userId: localIds.user1Id,
      rate: 0.8,
      seq: 1,
    }));
    const assignee2 = await wbsAssigneeRepository.create(testIds.wbsId, WbsAssignee.create({
      wbsId: testIds.wbsId,
      userId: localIds.user2Id,
      rate: 1.0,
      seq: 2,
    }));
    localIds.assignee1Id = assignee1.id!;
    localIds.assignee2Id = assignee2.id!;

    // 基本タスク作成
    const task1 = Task.create({
      taskNo: TaskNo.create('AG', 1),
      wbsId: testIds.wbsId,
      name: 'フロントエンド開発',
      assigneeId: assignee1.id,
      status: new TaskStatus({ status: 'IN_PROGRESS' }),
      periods: [
        Period.create({
          startDate: new Date('2025-05-01'),
          endDate: new Date('2025-05-05'),
          type: new PeriodType({ type: 'YOTEI' }),
          manHours: [ManHour.create({ kosu: 10, type: new ManHourType({ type: 'NORMAL' }) })],
        }),
      ],
    });
    const task2 = Task.create({
      taskNo: TaskNo.create('AG', 2),
      wbsId: testIds.wbsId,
      name: 'バックエンド開発',
      assigneeId: assignee2.id,
      status: new TaskStatus({ status: 'NOT_STARTED' }),
      periods: [
        Period.create({
          startDate: new Date('2025-05-06'),
          endDate: new Date('2025-05-10'),
          type: new PeriodType({ type: 'YOTEI' }),
          manHours: [ManHour.create({ kosu: 10, type: new ManHourType({ type: 'NORMAL' }) })],
        }),
      ],
    });

    const created1 = await taskRepository.create(task1);
    const created2 = await taskRepository.create(task2);
    localIds.taskIds.push(created1.id!, created2.id!);
  });

  afterAll(async () => {
    // 自分が作成したデータのみクリーンアップ（逆順）
    for (const scheduleId of localIds.scheduleIds) {
      await global.prisma.userSchedule.delete({ where: { id: scheduleId } }).catch(() => {});
    }
    for (const holidayId of localIds.holidayIds) {
      await global.prisma.companyHoliday.delete({ where: { id: holidayId } }).catch(() => {});
    }
    for (const taskId of localIds.taskIds) {
      await global.prisma.wbsTask.delete({ where: { id: taskId } }).catch(() => {});
    }
    for (const assigneeId of localIds.extraAssigneeIds) {
      await global.prisma.wbsAssignee.delete({ where: { id: assigneeId } }).catch(() => {});
    }
    await global.prisma.wbsAssignee.delete({ where: { id: localIds.assignee1Id } }).catch(() => {});
    await global.prisma.wbsAssignee.delete({ where: { id: localIds.assignee2Id } }).catch(() => {});
    await cleanupTestData(global.prisma);
  });

  describe('getAssigneeWorkloads', () => {
    it('複数担当者の作業負荷を正しく計算する', async () => {
      const startDate = new Date('2025-05-01');
      const endDate = new Date('2025-05-05');

      const workloads = await assigneeGanttService.getAssigneeWorkloads(
        testIds.wbsId, startDate, endDate
      );

      expect(workloads).toHaveLength(2);

      const yamadaWorkload = workloads.find(w => w.assigneeName === '山田太郎');
      expect(yamadaWorkload).toBeDefined();
      expect(yamadaWorkload!.assigneeRate).toBe(0.8);
      expect(yamadaWorkload!.dailyAllocations).toHaveLength(5);

      const tanakaWorkload = workloads.find(w => w.assigneeName === '田中花子');
      expect(tanakaWorkload).toBeDefined();
      expect(tanakaWorkload!.assigneeRate).toBe(1.0);
      expect(tanakaWorkload!.dailyAllocations).toHaveLength(5);
    });

    it('会社休日を考慮して作業負荷を計算する', async () => {
      // 2025-05-01(木)を会社休日に設定
      const holiday: CompanyHoliday = {
        date: new Date('2025-05-01'),
        name: 'ag-テスト祝日',
        type: 'COMPANY',
      };
      await companyHolidayRepository.save(holiday);
      // saveの戻り値からIDを取得
      const found = await global.prisma.companyHoliday.findFirst({
        where: { name: 'ag-テスト祝日' },
        orderBy: { id: 'desc' },
      });
      if (found) localIds.holidayIds.push(found.id);

      const startDate = new Date('2025-05-01');
      const endDate = new Date('2025-05-05');

      const workloads = await assigneeGanttService.getAssigneeWorkloads(
        testIds.wbsId, startDate, endDate
      );

      const yamadaWorkload = workloads.find(w => w.assigneeName === '山田太郎');
      const holidayAllocation = yamadaWorkload!.dailyAllocations.find(
        d => d.date.toDateString() === new Date('2025-05-01').toDateString()
      );

      expect(holidayAllocation).toBeDefined();
      expect(holidayAllocation!.isCompanyHoliday).toBe(true);
      expect(holidayAllocation!.availableHours).toBe(0);
      expect(holidayAllocation!.allocatedHours).toBe(0);
    });

    it('個人予定を考慮して作業負荷を計算する', async () => {
      // 山田太郎の個人予定を設定（2025-05-02金曜に3時間会議）
      const schedule = await global.prisma.userSchedule.create({
        data: {
          userId: localIds.user1Id,
          date: new Date('2025-05-02'),
          title: '午前会議',
          startTime: '09:00',
          endTime: '12:00',
        },
      });
      localIds.scheduleIds.push(schedule.id);

      const startDate = new Date('2025-05-01');
      const endDate = new Date('2025-05-05');

      const workloads = await assigneeGanttService.getAssigneeWorkloads(
        testIds.wbsId, startDate, endDate
      );

      const yamadaWorkload = workloads.find(w => w.assigneeName === '山田太郎');
      const scheduleDay = yamadaWorkload!.dailyAllocations.find(
        d => d.date.toDateString() === new Date('2025-05-02').toDateString()
      );

      expect(scheduleDay).toBeDefined();
      expect(scheduleDay!.userSchedules).toHaveLength(1);
      expect(scheduleDay!.userSchedules[0].title).toBe('午前会議');
      expect(scheduleDay!.userSchedules[0].durationHours).toBe(3);
      // 稼働可能時間が減少: min(7.5-3, 7.5*0.8) = min(4.5, 6) = 4.5
      expect(scheduleDay!.availableHours).toBe(4.5);
    });

    it('複数タスクの工数を日別に正しく配分する', async () => {
      // 追加タスク: 山田太郎に割り当て 2025-07-01〜2025-07-04（他テストに影響しない期間）
      const additionalTask = Task.create({
        taskNo: TaskNo.create('AG', 3),
        wbsId: testIds.wbsId,
        name: '追加タスク',
        assigneeId: localIds.assignee1Id,
        status: new TaskStatus({ status: 'NOT_STARTED' }),
        periods: [
          Period.create({
            startDate: new Date('2025-07-02'), // 水曜
            endDate: new Date('2025-07-04'),   // 金曜
            type: new PeriodType({ type: 'YOTEI' }),
            manHours: [ManHour.create({ kosu: 10, type: new ManHourType({ type: 'NORMAL' }) })],
          }),
        ],
      });
      const created = await taskRepository.create(additionalTask);
      localIds.taskIds.push(created.id!);

      // task1(フロントエンド開発)と重なる別タスクを同期間に作成
      const overlapTask = Task.create({
        taskNo: TaskNo.create('AG', 30),
        wbsId: testIds.wbsId,
        name: '重複タスク',
        assigneeId: localIds.assignee1Id,
        status: new TaskStatus({ status: 'NOT_STARTED' }),
        periods: [
          Period.create({
            startDate: new Date('2025-07-01'), // 火曜
            endDate: new Date('2025-07-04'),   // 金曜
            type: new PeriodType({ type: 'YOTEI' }),
            manHours: [ManHour.create({ kosu: 8, type: new ManHourType({ type: 'NORMAL' }) })],
          }),
        ],
      });
      const created2 = await taskRepository.create(overlapTask);
      localIds.taskIds.push(created2.id!);

      const startDate = new Date('2025-07-01');
      const endDate = new Date('2025-07-04');

      const workloads = await assigneeGanttService.getAssigneeWorkloads(
        testIds.wbsId, startDate, endDate
      );

      const yamadaWorkload = workloads.find(w => w.assigneeName === '山田太郎');

      // 7/2(水)は追加タスクと重複タスクの両方がアクティブ
      const day2 = yamadaWorkload!.dailyAllocations.find(
        d => d.date.toDateString() === new Date('2025-07-02').toDateString()
      );
      expect(day2!.taskAllocations.length).toBeGreaterThanOrEqual(2);

      // 7/1(火)は重複タスクのみアクティブ
      const day1 = yamadaWorkload!.dailyAllocations.find(
        d => d.date.toDateString() === new Date('2025-07-01').toDateString()
      );
      expect(day1!.taskAllocations).toHaveLength(1);
      expect(day1!.taskAllocations[0].taskName).toBe('重複タスク');
    });
  });

  describe('getAssigneeWarnings', () => {
    it('実現不可能なタスクの警告を生成する（土日のみ）', async () => {
      // 土日のみのタスク
      const weekendTask = Task.create({
        taskNo: TaskNo.create('AG', 4),
        wbsId: testIds.wbsId,
        name: '週末タスク',
        assigneeId: localIds.assignee1Id,
        status: new TaskStatus({ status: 'NOT_STARTED' }),
        periods: [
          Period.create({
            startDate: new Date('2025-05-17'), // 土曜日
            endDate: new Date('2025-05-18'),   // 日曜日
            type: new PeriodType({ type: 'YOTEI' }),
            manHours: [ManHour.create({ kosu: 10, type: new ManHourType({ type: 'NORMAL' }) })],
          }),
        ],
      });
      const created = await taskRepository.create(weekendTask);
      localIds.taskIds.push(created.id!);

      const startDate = new Date('2025-05-17');
      const endDate = new Date('2025-05-18');

      const warnings = await assigneeGanttService.getAssigneeWarnings(
        testIds.wbsId, startDate, endDate
      );

      const weekendWarning = warnings.find(w => w.taskName === '週末タスク');
      expect(weekendWarning).toBeDefined();
      expect(weekendWarning!.reason).toBe('NO_WORKING_DAYS');
      expect(weekendWarning!.assigneeName).toBe('山田太郎');
    });

    it('個人予定で全日埋まっているタスクに警告を生成する', async () => {
      // 田中花子の有給を設定
      const schedule = await global.prisma.userSchedule.create({
        data: {
          userId: localIds.user2Id,
          date: new Date('2025-05-15'),
          title: '有給',
          startTime: '09:00',
          endTime: '17:30',
        },
      });
      localIds.scheduleIds.push(schedule.id);

      // 単日タスク
      const singleDayTask = Task.create({
        taskNo: TaskNo.create('AG', 5),
        wbsId: testIds.wbsId,
        name: '単日タスク',
        assigneeId: localIds.assignee2Id,
        status: new TaskStatus({ status: 'NOT_STARTED' }),
        periods: [
          Period.create({
            startDate: new Date('2025-05-15'),
            endDate: new Date('2025-05-15'),
            type: new PeriodType({ type: 'YOTEI' }),
            manHours: [ManHour.create({ kosu: 10, type: new ManHourType({ type: 'NORMAL' }) })],
          }),
        ],
      });
      const created = await taskRepository.create(singleDayTask);
      localIds.taskIds.push(created.id!);

      const startDate = new Date('2025-05-15');
      const endDate = new Date('2025-05-15');

      const warnings = await assigneeGanttService.getAssigneeWarnings(
        testIds.wbsId, startDate, endDate
      );

      const warning = warnings.find(w => w.taskName === '単日タスク');
      expect(warning).toBeDefined();
      expect(warning!.assigneeName).toBe('田中花子');
      expect(warning!.reason).toBe('NO_WORKING_DAYS');
    });
  });

  describe('getAssigneeWorkload', () => {
    it('特定担当者の作業負荷を取得する', async () => {
      const startDate = new Date('2025-05-01');
      const endDate = new Date('2025-05-05');

      const workload = await assigneeGanttService.getAssigneeWorkload(
        testIds.wbsId, localIds.user1Id, startDate, endDate
      );

      expect(workload.assigneeId).toBe(localIds.user1Id);
      expect(workload.assigneeName).toBe('山田太郎');
      expect(workload.assigneeRate).toBe(0.8);
      expect(workload.dailyAllocations).toHaveLength(5);

      const hasTaskAllocations = workload.dailyAllocations.some(
        d => d.taskAllocations.length > 0
      );
      expect(hasTaskAllocations).toBe(true);
    });

    it('存在しない担当者の場合はエラーを投げる', async () => {
      const startDate = new Date('2025-05-01');
      const endDate = new Date('2025-05-05');

      await expect(
        assigneeGanttService.getAssigneeWorkload(
          testIds.wbsId, 'non-existent-user', startDate, endDate
        )
      ).rejects.toThrow('担当者が見つかりません');
    });
  });

  describe('稼働率と過負荷の計算', () => {
    it('過負荷状態を正しく検出する', async () => {
      // 1日で実行不可能な工数のタスクを作成
      const overloadTask = Task.create({
        taskNo: TaskNo.create('AG', 6),
        wbsId: testIds.wbsId,
        name: '過負荷タスク',
        assigneeId: localIds.assignee1Id,
        status: new TaskStatus({ status: 'NOT_STARTED' }),
        periods: [
          Period.create({
            startDate: new Date('2025-06-02'), // 月曜
            endDate: new Date('2025-06-02'),
            type: new PeriodType({ type: 'YOTEI' }),
            manHours: [ManHour.create({ kosu: 10, type: new ManHourType({ type: 'NORMAL' }) })],
          }),
        ],
      });
      const created = await taskRepository.create(overloadTask);
      localIds.taskIds.push(created.id!);

      const startDate = new Date('2025-06-02');
      const endDate = new Date('2025-06-02');

      const workloads = await assigneeGanttService.getAssigneeWorkloads(
        testIds.wbsId, startDate, endDate
      );

      const yamadaWorkload = workloads.find(w => w.assigneeName === '山田太郎');
      // allocatedHours(10) > availableHours(7.5*0.8=6)
      expect(yamadaWorkload!.dailyAllocations[0].allocatedHours).toBeGreaterThan(
        yamadaWorkload!.dailyAllocations[0].availableHours
      );
    });

    it('稼働率を考慮して工数を配分する', async () => {
      // 50%稼働の担当者を作成
      const partTimeAssignee = await wbsAssigneeRepository.create(testIds.wbsId, WbsAssignee.create({
        wbsId: testIds.wbsId,
        userId: localIds.user3Id,
        rate: 0.5,
        seq: 3,
      }));
      localIds.extraAssigneeIds.push(partTimeAssignee.id!);

      const partTimeTask = Task.create({
        taskNo: TaskNo.create('AG', 7),
        wbsId: testIds.wbsId,
        name: 'パートタイムタスク',
        assigneeId: partTimeAssignee.id,
        status: new TaskStatus({ status: 'NOT_STARTED' }),
        periods: [
          Period.create({
            startDate: new Date('2025-06-09'), // 月曜
            endDate: new Date('2025-06-13'),   // 金曜
            type: new PeriodType({ type: 'YOTEI' }),
            manHours: [ManHour.create({ kosu: 10, type: new ManHourType({ type: 'NORMAL' }) })],
          }),
        ],
      });
      const created = await taskRepository.create(partTimeTask);
      localIds.taskIds.push(created.id!);

      const startDate = new Date('2025-06-09');
      const endDate = new Date('2025-06-13');

      const workloads = await assigneeGanttService.getAssigneeWorkloads(
        testIds.wbsId, startDate, endDate
      );

      const satoWorkload = workloads.find(w => w.assigneeName === '佐藤次郎');
      expect(satoWorkload).toBeDefined();
      expect(satoWorkload!.assigneeRate).toBe(0.5);

      // 各日の稼働可能時間が50%: 7.5 * 0.5 = 3.75
      const weekday = satoWorkload!.dailyAllocations.find(
        d => !d.isWeekend && !d.isCompanyHoliday
      );
      expect(weekday!.availableHours).toBe(7.5 * 0.5);
    });
  });
});
