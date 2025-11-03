import { container } from '@/lib/inversify.config';
import { SYMBOL } from '@/types/symbol';
import { IAssigneeGanttService } from '@/applications/assignee-gantt/iassignee-gantt.service';
import { ITaskRepository } from '@/applications/task/itask-repository';
import { IWbsAssigneeRepository } from '@/applications/wbs/iwbs-assignee-repository';
import { IUserScheduleRepository } from '@/applications/calendar/iuser-schedule-repository';
import { ICompanyHolidayRepository } from '@/applications/calendar/icompany-holiday-repository';
import { IWbsRepository } from '@/applications/wbs/iwbs-repository';
import { IProjectRepository } from '@/applications/project/iproject-repository';
import { PrismaClient } from '@prisma/client';
import { Task } from '@/domains/task/task';
import { WbsAssignee } from '@/domains/wbs/wbs-assignee';
import { Wbs } from '@/domains/wbs/wbs';
import { Project } from '@/domains/project/project';
import { TaskNo } from '@/domains/task/task-no';
import { TaskStatus } from '@/domains/task/task-status';
import { Period } from '@/domains/period/period';
import { CompanyHoliday } from '@/domains/calendar/company-calendar';
import { UserSchedule } from '@/domains/calendar/assignee-working-calendar';

describe('AssigneeGantt Integration Tests', () => {
  let assigneeGanttService: IAssigneeGanttService;
  let taskRepository: ITaskRepository;
  let wbsAssigneeRepository: IWbsAssigneeRepository;
  let userScheduleRepository: IUserScheduleRepository;
  let companyHolidayRepository: ICompanyHolidayRepository;
  let wbsRepository: IWbsRepository;
  let projectRepository: IProjectRepository;
  let prisma: PrismaClient;

  let testProject: Project;
  let testWbs: Wbs;
  let testAssignees: WbsAssignee[];
  let testTasks: Task[];

  beforeAll(async () => {
    // DIコンテナから必要なサービスを取得
    assigneeGanttService = container.get<IAssigneeGanttService>(SYMBOL.IAssigneeGanttService);
    taskRepository = container.get<ITaskRepository>(SYMBOL.ITaskRepository);
    wbsAssigneeRepository = container.get<IWbsAssigneeRepository>(SYMBOL.IWbsAssigneeRepository);
    userScheduleRepository = container.get<IUserScheduleRepository>(SYMBOL.IUserScheduleRepository);
    companyHolidayRepository = container.get<ICompanyHolidayRepository>(SYMBOL.ICompanyHolidayRepository);
    wbsRepository = container.get<IWbsRepository>(SYMBOL.IWbsRepository);
    projectRepository = container.get<IProjectRepository>(SYMBOL.IProjectRepository);
    prisma = new PrismaClient();
  });

  beforeEach(async () => {
    // テストデータをクリーンアップ
    await prisma.task.deleteMany();
    await prisma.wbsAssignee.deleteMany();
    await prisma.wbs.deleteMany();
    await prisma.project.deleteMany();
    await prisma.userSchedule.deleteMany();
    await prisma.companyHoliday.deleteMany();

    // テストプロジェクトを作成
    testProject = Project.create({
      name: 'Test Project',
      description: 'Integration test project',
      startDate: new Date('2024-01-01'),
      endDate: new Date('2024-12-31'),
      status: 'ACTIVE'
    });
    await projectRepository.save(testProject);

    // テストWBSを作成
    testWbs = Wbs.create({
      projectId: testProject.id!,
      name: 'Test WBS',
      version: 1,
      createdUserId: 'test-user'
    });
    await wbsRepository.save(testWbs);

    // テスト担当者を作成
    const assignee1 = WbsAssignee.create({
      wbsId: testWbs.id!,
      userId: 'user-001',
      userName: '山田太郎',
      rate: 0.8 // 80%稼働
    });
    const assignee2 = WbsAssignee.create({
      wbsId: testWbs.id!,
      userId: 'user-002',
      userName: '田中花子',
      rate: 1.0 // 100%稼働
    });
    await wbsAssigneeRepository.save(assignee1);
    await wbsAssigneeRepository.save(assignee2);
    testAssignees = [assignee1, assignee2];

    // テストタスクを作成
    const task1 = Task.create({
      taskNo: TaskNo.create('TASK-001'),
      wbsId: testWbs.id!,
      name: 'フロントエンド開発',
      assigneeId: assignee1.id,
      status: TaskStatus.InProgress,
      periods: [
        Period.reconstruct({
          id: 1,
          periodType: 'YOTEI',
          startDate: new Date('2024-01-15'),
          endDate: new Date('2024-01-19'),
          kosuu: 40 // 40時間
        })
      ]
    });

    const task2 = Task.create({
      taskNo: TaskNo.create('TASK-002'),
      wbsId: testWbs.id!,
      name: 'バックエンド開発',
      assigneeId: assignee2.id,
      status: TaskStatus.NotStarted,
      periods: [
        Period.reconstruct({
          id: 2,
          periodType: 'YOTEI',
          startDate: new Date('2024-01-16'),
          endDate: new Date('2024-01-20'),
          kosuu: 32 // 32時間
        })
      ]
    });

    await taskRepository.save(task1);
    await taskRepository.save(task2);
    testTasks = [task1, task2];
  });

  afterEach(async () => {
    // テストデータをクリーンアップ
    await prisma.task.deleteMany();
    await prisma.wbsAssignee.deleteMany();
    await prisma.wbs.deleteMany();
    await prisma.project.deleteMany();
    await prisma.userSchedule.deleteMany();
    await prisma.companyHoliday.deleteMany();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('getAssigneeWorkloads', () => {
    it('複数担当者の作業負荷を正しく計算する', async () => {
      // Arrange
      const startDate = new Date('2024-01-15');
      const endDate = new Date('2024-01-19');

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
        taskNo: TaskNo.create('TASK-003'),
        wbsId: testWbs.id!,
        name: '追加タスク',
        assigneeId: testAssignees[0].id, // 山田太郎に割り当て
        status: TaskStatus.NotStarted,
        periods: [
          Period.reconstruct({
            id: 3,
            periodType: 'YOTEI',
            startDate: new Date('2024-01-17'),
            endDate: new Date('2024-01-19'),
            kosuu: 24 // 24時間
          })
        ]
      });
      await taskRepository.save(additionalTask);

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
        taskNo: TaskNo.create('TASK-004'),
        wbsId: testWbs.id!,
        name: '週末タスク',
        assigneeId: testAssignees[0].id,
        status: TaskStatus.NotStarted,
        periods: [
          Period.reconstruct({
            id: 4,
            periodType: 'YOTEI',
            startDate: new Date('2024-01-20'), // 土曜日
            endDate: new Date('2024-01-21'), // 日曜日
            kosuu: 16
          })
        ]
      });
      await taskRepository.save(weekendTask);

      // 土日を会社休日に設定
      await companyHolidayRepository.save({
        date: new Date('2024-01-20'),
        name: '土曜日',
        type: 'COMPANY'
      });
      await companyHolidayRepository.save({
        date: new Date('2024-01-21'),
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
        taskNo: TaskNo.create('TASK-005'),
        wbsId: testWbs.id!,
        name: '単日タスク',
        assigneeId: testAssignees[1].id, // 田中花子
        status: TaskStatus.NotStarted,
        periods: [
          Period.reconstruct({
            id: 5,
            periodType: 'YOTEI',
            startDate: new Date('2024-01-15'),
            endDate: new Date('2024-01-15'),
            kosuu: 8
          })
        ]
      });
      await taskRepository.save(singleDayTask);

      // 田中花子の終日予定を設定
      await prisma.userSchedule.create({
        data: {
          userId: 'user-002',
          date: new Date('2024-01-15'),
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
      expect(warnings[0].taskNo).toBe('TASK-005');
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
        taskNo: TaskNo.create('TASK-006'),
        wbsId: testWbs.id!,
        name: '過負荷タスク',
        assigneeId: testAssignees[0].id, // 山田太郎（80%稼働）
        status: TaskStatus.NotStarted,
        periods: [
          Period.reconstruct({
            id: 6,
            periodType: 'YOTEI',
            startDate: new Date('2024-01-15'),
            endDate: new Date('2024-01-15'),
            kosuu: 10 // 1日10時間は過負荷
          })
        ]
      });
      await taskRepository.save(overloadTask);

      // Act
      const workloads = await assigneeGanttService.getAssigneeWorkloads(
        testWbs.id!,
        startDate,
        endDate
      );

      // Assert
      const yamadaWorkload = workloads.find(w => w.assigneeName === '山田太郎');
      expect(yamadaWorkload!.overloadedDays).toHaveLength(1);

      const overloadedDay = yamadaWorkload!.overloadedDays[0];
      expect(overloadedDay.isOverloaded).toBe(true);
      expect(overloadedDay.allocatedHours).toBeGreaterThan(overloadedDay.availableHours);
    });

    it('稼働率を考慮して工数を配分する', async () => {
      // Arrange
      const startDate = new Date('2024-01-15');
      const endDate = new Date('2024-01-19');

      // 50%稼働の担当者を作成
      const partTimeAssignee = WbsAssignee.create({
        wbsId: testWbs.id!,
        userId: 'user-003',
        userName: '佐藤次郎',
        rate: 0.5 // 50%稼働
      });
      await wbsAssigneeRepository.save(partTimeAssignee);

      // タスクを割り当て
      const partTimeTask = Task.create({
        taskNo: TaskNo.create('TASK-007'),
        wbsId: testWbs.id!,
        name: 'パートタイムタスク',
        assigneeId: partTimeAssignee.id,
        status: TaskStatus.NotStarted,
        periods: [
          Period.reconstruct({
            id: 7,
            periodType: 'YOTEI',
            startDate: new Date('2024-01-15'),
            endDate: new Date('2024-01-19'),
            kosuu: 20 // 20時間
          })
        ]
      });
      await taskRepository.save(partTimeTask);

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