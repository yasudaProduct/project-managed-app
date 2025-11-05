import { container } from '@/lib/inversify.config';
import { SYMBOL } from '@/types/symbol';
import { IAssigneeGanttService } from '@/applications/assignee-gantt/iassignee-gantt.service';
import { ITaskRepository } from '@/applications/task/itask-repository';
import { IWbsAssigneeRepository } from '@/applications/wbs/iwbs-assignee-repository';
import { ICompanyHolidayRepository } from '@/applications/calendar/icompany-holiday-repository';
import { IWbsRepository } from '@/applications/wbs/iwbs-repository';
import { IProjectRepository } from '@/applications/projects/iproject-repository';
import { PrismaClient } from '@prisma/client';
import { Task } from '@/domains/task/task';
import { WbsAssignee } from '@/domains/wbs/wbs-assignee';
import { Wbs } from '@/domains/wbs/wbs';
import { Project } from '@/domains/project/project';
import { TaskNo } from '@/domains/task/value-object/task-id';
import { TaskStatus } from '@/domains/task/value-object/project-status';
import { Period } from '@/domains/task/period';
import { CompanyHoliday } from '@/domains/calendar/company-calendar';
import { ProjectStatus } from '@/domains/project/project-status';
import { PeriodType } from '@/domains/task/value-object/period-type';
import { ManHour } from '@/domains/task/man-hour';
import { ManHourType } from '@/domains/task/value-object/man-hour-type';

describe('AssigneeGantt Integration Tests', () => {
  let assigneeGanttService: IAssigneeGanttService;
  let taskRepository: ITaskRepository;
  let wbsAssigneeRepository: IWbsAssigneeRepository;

  let companyHolidayRepository: ICompanyHolidayRepository;
  let wbsRepository: IWbsRepository;
  let projectRepository: IProjectRepository;
  let prisma: PrismaClient;

  let testProject: Project;
  let testWbs: Wbs;
  let testAssignees: WbsAssignee[];

  beforeAll(async () => {
    // DIコンテナから必要なサービスを取得
    assigneeGanttService = container.get<IAssigneeGanttService>(SYMBOL.IAssigneeGanttService);
    taskRepository = container.get<ITaskRepository>(SYMBOL.ITaskRepository);
    wbsAssigneeRepository = container.get<IWbsAssigneeRepository>(SYMBOL.IWbsAssigneeRepository);
    companyHolidayRepository = container.get<ICompanyHolidayRepository>(SYMBOL.ICompanyHolidayRepository);
    wbsRepository = container.get<IWbsRepository>(SYMBOL.IWbsRepository);
    projectRepository = container.get<IProjectRepository>(SYMBOL.IProjectRepository);
    prisma = new PrismaClient();
  });

  beforeEach(async () => {
    // テストデータをクリーンアップ
    await prisma.wbsTask.deleteMany();
    await prisma.wbsAssignee.deleteMany();
    await prisma.wbsPhase.deleteMany();
    await prisma.milestone.deleteMany();
    await prisma.wbsBuffer.deleteMany();
    await prisma.wbs.deleteMany();
    await prisma.projects.deleteMany();
    await prisma.userSchedule.deleteMany();
    await prisma.companyHoliday.deleteMany();

    await prisma.users.upsert({
      where: { id: 'user-001' },
      update: {},
      create: {
        id: 'user-001',
        email: 'user001@example.com',
        name: '山田太郎',
        displayName: '山田太郎',
      },
    });
    await prisma.users.upsert({
      where: { id: 'user-002' },
      update: {},
      create: {
        id: 'user-002',
        email: 'user002@example.com',
        name: '田中花子',
        displayName: '田中花子',
      },
    });
    await prisma.users.upsert({
      where: { id: 'user-003' },
      update: {},
      create: {
        id: 'user-003',
        email: 'user003@example.com',
        name: '佐藤次郎',
        displayName: '佐藤次郎',
      },
    });

    // テストプロジェクトを作成
    testProject = Project.create({
      name: '結合テスト用プロジェクト',
      description: '結合テスト用プロジェクト',
      startDate: new Date('2025-05-01'),
      endDate: new Date('2025-12-31'),
    });
    testProject.updateStatus(new ProjectStatus({ status: 'ACTIVE' }));
    const projectDb = await projectRepository.create(testProject);

    // テストWBSを作成
    testWbs = Wbs.create({
      name: '結合テスト用WBS',
      projectId: projectDb.id!,
    });
    const wbsDb = await wbsRepository.create(testWbs);

    // テスト担当者を作成
    const assignee1 = WbsAssignee.create({
      wbsId: wbsDb.id!,
      userId: 'user-001',
      rate: 0.8, // 80%稼働
      seq: 1,
    });
    const assignee2 = WbsAssignee.create({
      wbsId: testWbs.id!,
      userId: 'user-002',
      rate: 1.0, // 100%稼働
      seq: 2,
    });
    await wbsAssigneeRepository.create(wbsDb.id!, assignee1);
    await wbsAssigneeRepository.create(wbsDb.id!, assignee2);
    testAssignees = [assignee1, assignee2];

    // テストタスクを作成
    const task1 = Task.create({
      taskNo: TaskNo.create('A1', 1),
      wbsId: testWbs.id!,
      name: 'フロントエンド開発',
      assigneeId: assignee1.id,
      status: new TaskStatus({ status: 'IN_PROGRESS' }),
      periods: [
        Period.create({
          startDate: new Date('2025-05-01'),
          endDate: new Date('2025-05-05'),
          type: new PeriodType({ type: 'YOTEI' }),
          manHours: [
            ManHour.create({ kosu: 10, type: new ManHourType({ type: 'NORMAL' }) })
          ]
        })
      ]
    });

    const task2 = Task.create({
      taskNo: TaskNo.create('A2', 2),
      wbsId: testWbs.id!,
      name: 'バックエンド開発',
      assigneeId: assignee2.id,
      status: new TaskStatus({ status: 'NOT_STARTED' }),
      periods: [
        Period.create({
          startDate: new Date('2025-05-06'),
          endDate: new Date('2025-05-10'),
          type: new PeriodType({ type: 'YOTEI' }),
          manHours: [
            ManHour.create({ kosu: 10, type: new ManHourType({ type: 'NORMAL' }) })
          ]
        })
      ]
    });

    await taskRepository.create(task1);
    await taskRepository.create(task2);
  });

  afterEach(async () => {
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('getAssigneeWorkloads', () => {
    it('複数担当者の作業負荷を正しく計算する', async () => {
      // Arrange
      const startDate = new Date('2025-05-01');
      const endDate = new Date('2025-05-05');

      // Act
      const workloads = await assigneeGanttService.getAssigneeWorkloads(
        testWbs.id!,
        startDate,
        endDate
      );

      // Assert
      expect(workloads).toHaveLength(2);

      // 山田太郎の作業負荷を確認
      const yamadaWorkload = workloads.find(w => w.assigneeName === '山田太郎');
      expect(yamadaWorkload).toBeDefined();
      expect(yamadaWorkload!.assigneeRate).toBe(0.8);
      expect(yamadaWorkload!.dailyAllocations).toHaveLength(5); // 5日間

      // 田中花子の作業負荷を確認
      const tanakaWorkload = workloads.find(w => w.assigneeName === '田中花子');
      expect(tanakaWorkload).toBeDefined();
      expect(tanakaWorkload!.assigneeRate).toBe(1.0);
      expect(tanakaWorkload!.dailyAllocations).toHaveLength(5); // 5日間
    });

    it('会社休日を考慮して作業負荷を計算する', async () => {
      // Arrange
      const startDate = new Date('2024-01-15');
      const endDate = new Date('2024-01-19');

      // 会社休日を設定（1/17を祝日とする）
      const holiday: CompanyHoliday = {
        date: new Date('2024-01-17'),
        name: '祝日',
        type: 'NATIONAL'
      };
      await companyHolidayRepository.save(holiday);

      // Act
      const workloads = await assigneeGanttService.getAssigneeWorkloads(
        testWbs.id!,
        startDate,
        endDate
      );

      // Assert
      const yamadaWorkload = workloads.find(w => w.assigneeName === '山田太郎');
      const holidayAllocation = yamadaWorkload!.dailyAllocations.find(
        d => d.date.toDateString() === new Date('2024-01-17').toDateString()
      );

      expect(holidayAllocation).toBeDefined();
      expect(holidayAllocation!.isCompanyHoliday).toBe(true);
      expect(holidayAllocation!.availableHours).toBe(0); // 休日なので稼働時間0
      expect(holidayAllocation!.allocatedHours).toBe(0); // 工数配分も0
    });

    it('個人予定を考慮して作業負荷を計算する', async () => {
      // Arrange
      const startDate = new Date('2024-01-15');
      const endDate = new Date('2024-01-19');

      // 山田太郎の個人予定を設定
      await prisma.userSchedule.create({
        data: {
          userId: 'user-001',
          date: new Date('2024-01-16'),
          title: '午前休',
          startTime: '09:00',
          endTime: '12:00'
        }
      });

      // Act
      const workloads = await assigneeGanttService.getAssigneeWorkloads(
        testWbs.id!,
        startDate,
        endDate
      );

      // Assert
      const yamadaWorkload = workloads.find(w => w.assigneeName === '山田太郎');
      const scheduleDay = yamadaWorkload!.dailyAllocations.find(
        d => d.date.toDateString() === new Date('2024-01-16').toDateString()
      );

      expect(scheduleDay).toBeDefined();
      expect(scheduleDay!.userSchedules).toHaveLength(1);
      expect(scheduleDay!.userSchedules[0].title).toBe('午前休');
      expect(scheduleDay!.userSchedules[0].durationHours).toBe(3); // 3時間の予定
      // 稼働可能時間が減少していることを確認
      expect(scheduleDay!.availableHours).toBeLessThan(7.5 * 0.8);
    });

    it('複数タスクの工数を日別に正しく配分する', async () => {
      // Arrange
      const startDate = new Date('2024-01-15');
      const endDate = new Date('2024-01-19');

      // 同一担当者に複数タスクを割り当て
      const additionalTask = Task.create({
        taskNo: TaskNo.create('A3', 3),
        wbsId: testWbs.id!,
        name: '追加タスク',
        assigneeId: testAssignees[0].id, // 山田太郎に割り当て
        status: new TaskStatus({ status: 'NOT_STARTED' }),
        periods: [
          Period.create({
            startDate: new Date('2025-05-07'),
            endDate: new Date('2025-05-09'),
            type: new PeriodType({ type: 'YOTEI' }),
            manHours: [
              ManHour.create({ kosu: 10, type: new ManHourType({ type: 'NORMAL' }) })
            ]
          })
        ]
      });
      await taskRepository.create(additionalTask);

      // Act
      const workloads = await assigneeGanttService.getAssigneeWorkloads(
        testWbs.id!,
        startDate,
        endDate
      );

      // Assert
      const yamadaWorkload = workloads.find(w => w.assigneeName === '山田太郎');

      // 1/17は両方のタスクがアクティブ
      const day17 = yamadaWorkload!.dailyAllocations.find(
        d => d.date.toDateString() === new Date('2024-01-17').toDateString()
      );
      expect(day17!.taskAllocations).toHaveLength(2);

      // 1/15は最初のタスクのみアクティブ
      const day15 = yamadaWorkload!.dailyAllocations.find(
        d => d.date.toDateString() === new Date('2024-01-15').toDateString()
      );
      expect(day15!.taskAllocations).toHaveLength(1);
      expect(day15!.taskAllocations[0].taskName).toBe('フロントエンド開発');
    });
  });

  describe('getAssigneeWarnings', () => {
    it('実現不可能なタスクの警告を生成する', async () => {
      // Arrange
      const startDate = new Date('2024-01-20');
      const endDate = new Date('2024-01-22');

      // 週末のみのタスクを作成
      const weekendTask = Task.create({
        taskNo: TaskNo.create('A4', 4),
        wbsId: testWbs.id!,
        name: '週末タスク',
        assigneeId: testAssignees[0].id,
        status: new TaskStatus({ status: 'NOT_STARTED' }),
        periods: [
          Period.create({
            startDate: new Date('2025-05-20'), // 土曜日
            endDate: new Date('2025-05-21'), // 日曜日
            type: new PeriodType({ type: 'YOTEI' }),
            manHours: [
              ManHour.create({ kosu: 10, type: new ManHourType({ type: 'NORMAL' }) })
            ]
          })
        ]
      });
      await taskRepository.create(weekendTask);

      // 土日を会社休日に設定
      await companyHolidayRepository.save({
        date: new Date('2025-05-20'),
        name: '土曜日',
        type: 'COMPANY'
      });
      await companyHolidayRepository.save({
        date: new Date('2025-05-21'),
        name: '日曜日',
        type: 'COMPANY'
      });

      // Act
      const warnings = await assigneeGanttService.getAssigneeWarnings(
        testWbs.id!,
        startDate,
        endDate
      );

      // Assert
      expect(warnings).toHaveLength(1);
      expect(warnings[0].taskNo).toBe('TASK-004');
      expect(warnings[0].taskName).toBe('週末タスク');
      expect(warnings[0].reason).toBe('NO_WORKING_DAYS');
      expect(warnings[0].assigneeName).toBe('山田太郎');
    });

    it('個人予定で全日埋まっているタスクに警告を生成する', async () => {
      // Arrange
      const startDate = new Date('2024-01-15');
      const endDate = new Date('2024-01-15');

      // 単日タスクを作成
      const singleDayTask = Task.create({
        taskNo: TaskNo.create('A5', 5),
        wbsId: testWbs.id!,
        name: '単日タスク',
        assigneeId: testAssignees[1].id, // 田中花子
        status: new TaskStatus({ status: 'NOT_STARTED' }),
        periods: [
          Period.create({
            startDate: new Date('2025-05-15'),
            endDate: new Date('2025-05-15'),
            type: new PeriodType({ type: 'YOTEI' }),
            manHours: [
              ManHour.create({ kosu: 10, type: new ManHourType({ type: 'NORMAL' }) })
            ]
          })
        ]
      });
      await taskRepository.create(singleDayTask);

      // 田中花子の終日予定を設定
      await prisma.userSchedule.create({
        data: {
          userId: 'user-002',
          date: new Date('2025-05-15'),
          title: '終日休暇',
          startTime: '00:00',
          endTime: '24:00'
        }
      });

      // Act
      const warnings = await assigneeGanttService.getAssigneeWarnings(
        testWbs.id!,
        startDate,
        endDate
      );

      // Assert
      expect(warnings).toHaveLength(1);
      expect(warnings[0].taskNo).toBe('A5');
      expect(warnings[0].taskName).toBe('単日タスク');
      expect(warnings[0].assigneeName).toBe('田中花子');
      expect(warnings[0].reason).toBe('NO_WORKING_DAYS');
    });
  });

  describe('getAssigneeWorkload', () => {
    it('特定担当者の作業負荷を取得する', async () => {
      // Arrange
      const startDate = new Date('2024-01-15');
      const endDate = new Date('2024-01-19');

      // Act
      const workload = await assigneeGanttService.getAssigneeWorkload(
        testWbs.id!,
        'user-001',
        startDate,
        endDate
      );

      // Assert
      expect(workload.assigneeId).toBe('user-001');
      expect(workload.assigneeName).toBe('山田太郎');
      expect(workload.assigneeRate).toBe(0.8);
      expect(workload.dailyAllocations).toHaveLength(5);

      // タスクが正しく配分されていることを確認
      const hasTaskAllocations = workload.dailyAllocations.some(
        d => d.taskAllocations.length > 0
      );
      expect(hasTaskAllocations).toBe(true);
    });

    it('存在しない担当者の場合はエラーを投げる', async () => {
      // Arrange
      const startDate = new Date('2024-01-15');
      const endDate = new Date('2024-01-19');

      // Act & Assert
      await expect(
        assigneeGanttService.getAssigneeWorkload(
          testWbs.id!,
          'non-existent-user',
          startDate,
          endDate
        )
      ).rejects.toThrow('担当者が見つかりません');
    });
  });

  describe('稼働率と過負荷の計算', () => {
    it('過負荷状態を正しく検出する', async () => {
      // Arrange
      const startDate = new Date('2024-01-15');
      const endDate = new Date('2024-01-15');

      // 1日で実行不可能な工数のタスクを作成
      const overloadTask = Task.create({
        taskNo: TaskNo.create('A6', 6),
        wbsId: testWbs.id!,
        name: '過負荷タスク',
        assigneeId: testAssignees[0].id, // 山田太郎（80%稼働）
        status: new TaskStatus({ status: 'NOT_STARTED' }),
        periods: [
          Period.create({
            startDate: new Date('2025-05-15'),
            endDate: new Date('2025-05-15'),
            type: new PeriodType({ type: 'YOTEI' }),
            manHours: [
              ManHour.create({ kosu: 10, type: new ManHourType({ type: 'NORMAL' }) })
            ]
          })
        ]
      });
      await taskRepository.create(overloadTask);

      // Act
      const workloads = await assigneeGanttService.getAssigneeWorkloads(
        testWbs.id!,
        startDate,
        endDate
      );

      // Assert
      const yamadaWorkload = workloads.find(w => w.assigneeName === '山田太郎');
      expect(yamadaWorkload!.dailyAllocations.some(d => d.isOverloaded)).toBe(true);
    });

    it('稼働率を考慮して工数を配分する', async () => {
      // Arrange
      const startDate = new Date('2024-01-15');
      const endDate = new Date('2024-01-19');

      // 50%稼働の担当者を作成
      const partTimeAssignee = WbsAssignee.create({
        wbsId: testWbs.id!,
        userId: 'user-003',
        rate: 0.5, // 50%稼働
        seq: 3,
      });
      await wbsAssigneeRepository.create(testWbs.id!, partTimeAssignee);

      // タスクを割り当て
      const partTimeTask = Task.create({
        taskNo: TaskNo.create('A7', 7),
        wbsId: testWbs.id!,
        name: 'パートタイムタスク',
        assigneeId: partTimeAssignee.id,
        status: new TaskStatus({ status: 'NOT_STARTED' }),
        periods: [
          Period.create({
            startDate: new Date('2025-05-15'),
            endDate: new Date('2025-05-19'),
            type: new PeriodType({ type: 'YOTEI' }),
            manHours: [
              ManHour.create({ kosu: 10, type: new ManHourType({ type: 'NORMAL' }) })
            ]
          })
        ]
      });
      await taskRepository.create(partTimeTask);

      // Act
      const workloads = await assigneeGanttService.getAssigneeWorkloads(
        testWbs.id!,
        startDate,
        endDate
      );

      // Assert
      const satoWorkload = workloads.find(w => w.assigneeName === '佐藤次郎');
      expect(satoWorkload).toBeDefined();
      expect(satoWorkload!.assigneeRate).toBe(0.5);

      // 各日の稼働可能時間が50%になっていることを確認
      const weekday = satoWorkload!.dailyAllocations.find(
        d => !d.isWeekend && !d.isCompanyHoliday
      );
      expect(weekday!.availableHours).toBe(7.5 * 0.5); // 3.75時間
    });
  });
});