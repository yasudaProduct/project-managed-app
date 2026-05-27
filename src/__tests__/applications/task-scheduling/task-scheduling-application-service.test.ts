import { TaskSchedulingApplicationService, TaskSchedulingResult } from '@/applications/task-scheduling/task-scheduling-application.service';
import type { IWbsRepository } from '@/applications/wbs/iwbs-repository';
import type { ITaskRepository } from '@/applications/task/itask-repository';
import type { IProjectRepository } from '@/applications/projects/iproject-repository';
import type { IUserScheduleRepository } from '@/applications/calendar/iuser-schedule-repository';
import type { IWbsAssigneeRepository } from '@/applications/wbs/iwbs-assignee-repository';
import type { ISystemSettingsRepository } from '@/applications/system-settings/isystem-settings-repository';
import { Wbs } from '@/domains/wbs/wbs';
import { Project } from '@/domains/project/project';
import { Task } from '@/domains/task/task';
import { TaskNo } from '@/domains/task/value-object/task-id';
import { TaskStatus } from '@/domains/task/value-object/project-status';
import { Assignee } from '@/domains/task/assignee';
import { Period } from '@/domains/task/period';
import { PeriodType } from '@/domains/task/value-object/period-type';
import { ManHour } from '@/domains/task/man-hour';
import { ManHourType } from '@/domains/task/value-object/man-hour-type';
import { WorkRecord } from '@/domains/work-records/work-recoed';
import { WbsAssignee } from '@/domains/wbs/wbs-assignee';
import { SystemSettings } from '@/domains/system-settings/system-settings';

// reflect-metadata for inversify
import 'reflect-metadata';

describe('TaskSchedulingApplicationService', () => {
  let service: TaskSchedulingApplicationService;
  let wbsRepository: jest.Mocked<IWbsRepository>;
  let taskRepository: jest.Mocked<ITaskRepository>;
  let projectRepository: jest.Mocked<IProjectRepository>;
  let userScheduleRepository: jest.Mocked<IUserScheduleRepository>;
  let wbsAssigneeRepository: jest.Mocked<IWbsAssigneeRepository>;
  let systemSettingsRepository: jest.Mocked<ISystemSettingsRepository>;

  const wbsId = 1;
  const projectId = 'proj-1';
  const projectStartDate = new Date('2026-04-01');
  const projectEndDate = new Date('2026-12-31');

  // ヘルパー: タスク生成
  function createTask(args: {
    id: number;
    taskNo: string;
    name: string;
    assigneeId?: number;
    assigneeName?: string;
    status?: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';
    yoteiKosu?: number;
    yoteiStart?: Date;
    yoteiEnd?: Date;
    workRecords?: WorkRecord[];
  }): Task {
    const periods: Period[] = [];
    if (args.yoteiKosu !== undefined) {
      periods.push(
        Period.create({
          type: new PeriodType({ type: 'YOTEI' }),
          startDate: args.yoteiStart ?? new Date('2026-04-01'),
          endDate: args.yoteiEnd ?? new Date('2026-04-30'),
          manHours: [ManHour.create({ type: new ManHourType({ type: 'NORMAL' }), kosu: args.yoteiKosu })],
        })
      );
    }

    return Task.createFromDb({
      id: args.id,
      taskNo: TaskNo.reconstruct(args.taskNo),
      wbsId,
      name: args.name,
      status: new TaskStatus({ status: args.status ?? 'NOT_STARTED' }),
      assigneeId: args.assigneeId,
      assignee: args.assigneeName
        ? Assignee.create({ name: args.assigneeName, displayName: args.assigneeName })
        : undefined,
      periods,
      workRecords: args.workRecords ?? [],
    });
  }

  beforeEach(() => {
    wbsRepository = {
      findById: jest.fn(),
      findByProjectId: jest.fn(),
      findAll: jest.fn(),
      save: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      exists: jest.fn(),
    };

    taskRepository = {
      findById: jest.fn(),
      findAll: jest.fn(),
      findByWbsId: jest.fn(),
      findTasksByPeriod: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };

    projectRepository = {
      findById: jest.fn(),
      findByName: jest.fn(),
      findAll: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };

    userScheduleRepository = {
      findByUserId: jest.fn().mockResolvedValue([]),
      findByUserIdAndDateRange: jest.fn().mockResolvedValue([]),
      findByUsersAndDateRange: jest.fn().mockResolvedValue([]),
      findByUserIdAndDate: jest.fn().mockResolvedValue([]),
      save: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };

    wbsAssigneeRepository = {
      findById: jest.fn(),
      findByWbsId: jest.fn(),
      findAll: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };

    systemSettingsRepository = {
      get: jest.fn().mockResolvedValue(SystemSettings.create(7.5)),
      update: jest.fn(),
    };

    // WBS・プロジェクトの基本セットアップ
    wbsRepository.findById.mockResolvedValue(
      Wbs.createFromDb({ id: wbsId, name: 'WBS1', projectId })
    );
    projectRepository.findById.mockResolvedValue(
      Project.create({ name: 'Project1', startDate: projectStartDate, endDate: projectEndDate })
    );

    service = new TaskSchedulingApplicationService(
      wbsRepository,
      taskRepository,
      projectRepository,
      userScheduleRepository,
      wbsAssigneeRepository,
      systemSettingsRepository,
    );
  });

  // 担当者のモックセットアップ
  function setupAssignee(assigneeId: number, userId: string) {
    wbsAssigneeRepository.findById.mockImplementation(async (id) => {
      if (id === assigneeId) {
        return WbsAssignee.createFromDb({
          id: assigneeId,
          wbsId,
          userId,
          rate: 1,
          costPerHour: 5000,
          seq: 1,
        });
      }
      return null;
    });
  }

  function setupMultipleAssignees(assignees: Array<{ id: number; userId: string }>) {
    wbsAssigneeRepository.findById.mockImplementation(async (id) => {
      const found = assignees.find(a => a.id === id);
      if (found) {
        return WbsAssignee.createFromDb({
          id: found.id,
          wbsId,
          userId: found.userId,
          rate: 1,
          costPerHour: 5000,
          seq: 1,
        });
      }
      return null;
    });
  }

  // ====================================
  // 初期計画モード（現行互換）
  // ====================================
  describe('初期計画モード (mode=initial)', () => {
    it('プロジェクト開始日から前詰めでスケジュールが計算される', async () => {
      setupAssignee(10, 'user-1');
      taskRepository.findByWbsId.mockResolvedValue([
        createTask({ id: 1, taskNo: 'D1-0001', name: 'タスクA', assigneeId: 10, assigneeName: '田中', yoteiKosu: 7.5 }),
        createTask({ id: 2, taskNo: 'D1-0002', name: 'タスクB', assigneeId: 10, assigneeName: '田中', yoteiKosu: 15 }),
      ]);

      const results = await service.calculateWbsTaskSchedules(wbsId, {
        mode: 'initial',
      });

      expect(results).toHaveLength(2);
      // タスクA: 4/1開始、7.5h = 1営業日 → 4/1終了
      expect(results[0].plannedStartDate).toEqual(new Date('2026-04-01'));
      expect(results[0].plannedEndDate).toEqual(new Date('2026-04-01'));
      // タスクB: 4/2開始、15h = 2営業日 → 4/3終了
      expect(results[1].plannedStartDate).toEqual(new Date('2026-04-02'));
      expect(results[1].plannedEndDate).toEqual(new Date('2026-04-03'));
    });

    it('担当者起点日を指定すると、その担当者はその日から開始する', async () => {
      setupMultipleAssignees([
        { id: 10, userId: 'user-1' },
        { id: 20, userId: 'user-2' },
      ]);
      taskRepository.findByWbsId.mockResolvedValue([
        createTask({ id: 1, taskNo: 'D1-0001', name: 'タスクA', assigneeId: 10, assigneeName: '田中', yoteiKosu: 7.5 }),
        createTask({ id: 2, taskNo: 'D1-0002', name: 'タスクB', assigneeId: 20, assigneeName: '佐藤', yoteiKosu: 7.5 }),
      ]);

      const results = await service.calculateWbsTaskSchedules(wbsId, {
        mode: 'initial',
        assigneeStartDates: new Map([[20, new Date('2026-05-01')]]),
      });

      expect(results).toHaveLength(2);
      // 田中: プロジェクト開始日 4/1 から
      expect(results[0].plannedStartDate).toEqual(new Date('2026-04-01'));
      // 佐藤: 担当者起点日 5/1 から
      expect(results[1].plannedStartDate).toEqual(new Date('2026-05-01'));
    });

    it('担当者起点日より前タスク終了日の翌営業日が遅い場合、遅い方が採用される', async () => {
      setupAssignee(10, 'user-1');
      taskRepository.findByWbsId.mockResolvedValue([
        createTask({ id: 1, taskNo: 'D1-0001', name: 'タスクA', assigneeId: 10, assigneeName: '田中', yoteiKosu: 75 }),
        createTask({ id: 2, taskNo: 'D1-0002', name: 'タスクB', assigneeId: 10, assigneeName: '田中', yoteiKosu: 7.5 }),
      ]);

      // 担当者起点日を4/5に設定するが、タスクAが75h=10営業日かかるので
      // タスクBの開始日は前タスク終了日の翌営業日が優先される
      const results = await service.calculateWbsTaskSchedules(wbsId, {
        mode: 'initial',
        assigneeStartDates: new Map([[10, new Date('2026-04-05')]]),
      });

      expect(results).toHaveLength(2);
      // タスクA: 担当者起点日4/5から開始
      expect(results[0].plannedStartDate).toEqual(new Date('2026-04-05'));
      // タスクB: タスクA終了日の翌営業日から（4/5ではなく）
      const taskBStart = results[1].plannedStartDate!;
      expect(taskBStart.getTime()).toBeGreaterThan(new Date('2026-04-05').getTime());
    });

    it('タスク状態に関係なく全タスクが計算対象になる', async () => {
      setupAssignee(10, 'user-1');
      taskRepository.findByWbsId.mockResolvedValue([
        createTask({ id: 1, taskNo: 'D1-0001', name: '完了タスク', assigneeId: 10, assigneeName: '田中', status: 'COMPLETED', yoteiKosu: 7.5 }),
        createTask({ id: 2, taskNo: 'D1-0002', name: '進行中タスク', assigneeId: 10, assigneeName: '田中', status: 'IN_PROGRESS', yoteiKosu: 7.5 }),
        createTask({ id: 3, taskNo: 'D1-0003', name: '未着手タスク', assigneeId: 10, assigneeName: '田中', status: 'NOT_STARTED', yoteiKosu: 7.5 }),
      ]);

      const results = await service.calculateWbsTaskSchedules(wbsId, {
        mode: 'initial',
      });

      // 全タスクに開始日・終了日が計算される
      expect(results).toHaveLength(3);
      results.forEach(r => {
        expect(r.plannedStartDate).toBeDefined();
        expect(r.plannedEndDate).toBeDefined();
      });
    });
  });

  // ====================================
  // リスケモード
  // ====================================
  describe('リスケモード (mode=reschedule)', () => {
    const rescheduleBaseDate = new Date('2026-05-26');

    it('完了タスクはスキップされ、実績がそのまま返される', async () => {
      setupAssignee(10, 'user-1');
      const completedTask = createTask({
        id: 1,
        taskNo: 'D1-0001',
        name: '完了タスク',
        assigneeId: 10,
        assigneeName: '田中',
        status: 'COMPLETED',
        yoteiKosu: 15,
        workRecords: [
          WorkRecord.createFromDb({
            id: 1,
            userId: 'user-1',
            taskId: 1,
            startDate: new Date('2026-04-01'),
            endDate: new Date('2026-04-03'),
            manHours: 15,
          }),
        ],
      });
      const pendingTask = createTask({
        id: 2,
        taskNo: 'D1-0002',
        name: '未着手タスク',
        assigneeId: 10,
        assigneeName: '田中',
        status: 'NOT_STARTED',
        yoteiKosu: 7.5,
      });
      taskRepository.findByWbsId.mockResolvedValue([completedTask, pendingTask]);

      const results = await service.calculateWbsTaskSchedules(wbsId, {
        mode: 'reschedule',
        rescheduleBaseDate,
      });

      expect(results).toHaveLength(2);
      // 完了タスクは実績日付がそのまま
      expect(results[0].plannedStartDate).toEqual(new Date('2026-04-01'));
      expect(results[0].plannedEndDate).toEqual(new Date('2026-04-03'));
      // 未着手タスクは完了タスクの終了日の翌営業日から
      expect(results[1].plannedStartDate).toBeDefined();
      expect(results[1].plannedStartDate!.getTime()).toBeGreaterThan(new Date('2026-04-03').getTime());
    });

    it('進行中タスクは開始日を維持し、残工数で終了日のみ再計算される', async () => {
      setupAssignee(10, 'user-1');
      const inProgressTask = createTask({
        id: 1,
        taskNo: 'D1-0001',
        name: '進行中タスク',
        assigneeId: 10,
        assigneeName: '田中',
        status: 'IN_PROGRESS',
        yoteiKosu: 30, // 予定30h
        workRecords: [
          WorkRecord.createFromDb({
            id: 1,
            userId: 'user-1',
            taskId: 1,
            startDate: new Date('2026-05-01'),
            endDate: new Date('2026-05-02'),
            manHours: 15, // 実績15h → 残15h
          }),
        ],
      });
      taskRepository.findByWbsId.mockResolvedValue([inProgressTask]);

      const results = await service.calculateWbsTaskSchedules(wbsId, {
        mode: 'reschedule',
        rescheduleBaseDate,
      });

      expect(results).toHaveLength(1);
      // 開始日は実績の開始日を維持
      expect(results[0].plannedStartDate).toEqual(new Date('2026-05-01'));
      // 終了日は残工数15hで再計算（rescheduleBaseDateから）
      expect(results[0].plannedEndDate).toBeDefined();
      // 残15h / 7.5h/日 = 2日
      expect(results[0].plannedManHours).toBe(15); // 残工数が表示される
    });

    it('未着手タスクはrescheduleBaseDateまたは前タスク終了日の遅い方から開始する', async () => {
      setupAssignee(10, 'user-1');
      taskRepository.findByWbsId.mockResolvedValue([
        createTask({ id: 1, taskNo: 'D1-0001', name: '未着手A', assigneeId: 10, assigneeName: '田中', status: 'NOT_STARTED', yoteiKosu: 7.5 }),
        createTask({ id: 2, taskNo: 'D1-0002', name: '未着手B', assigneeId: 10, assigneeName: '田中', status: 'NOT_STARTED', yoteiKosu: 7.5 }),
      ]);

      const results = await service.calculateWbsTaskSchedules(wbsId, {
        mode: 'reschedule',
        rescheduleBaseDate,
      });

      expect(results).toHaveLength(2);
      // 未着手A: rescheduleBaseDateから開始
      expect(results[0].plannedStartDate).toEqual(rescheduleBaseDate);
      // 未着手B: Aの終了日の翌営業日から
      expect(results[1].plannedStartDate!.getTime()).toBeGreaterThan(rescheduleBaseDate.getTime());
    });

    it('リスケモードでrescheduleBaseDateが省略された場合、エラーになる', async () => {
      taskRepository.findByWbsId.mockResolvedValue([]);

      await expect(
        service.calculateWbsTaskSchedules(wbsId, {
          mode: 'reschedule',
        })
      ).rejects.toThrow();
    });

    it('完了タスクの終了日が担当者の最終終了日として引き継がれる', async () => {
      setupAssignee(10, 'user-1');
      const completedTask = createTask({
        id: 1,
        taskNo: 'D1-0001',
        name: '完了タスク',
        assigneeId: 10,
        assigneeName: '田中',
        status: 'COMPLETED',
        yoteiKosu: 15,
        workRecords: [
          WorkRecord.createFromDb({
            id: 1,
            userId: 'user-1',
            taskId: 1,
            startDate: new Date('2026-05-20'),
            endDate: new Date('2026-05-28'),
            manHours: 15,
          }),
        ],
      });
      const pendingTask = createTask({
        id: 2,
        taskNo: 'D1-0002',
        name: '未着手タスク',
        assigneeId: 10,
        assigneeName: '田中',
        status: 'NOT_STARTED',
        yoteiKosu: 7.5,
      });
      taskRepository.findByWbsId.mockResolvedValue([completedTask, pendingTask]);

      const results = await service.calculateWbsTaskSchedules(wbsId, {
        mode: 'reschedule',
        rescheduleBaseDate: new Date('2026-05-26'),
      });

      // 未着手タスクは完了タスクの終了日(5/28)の翌営業日から開始
      // （rescheduleBaseDate 5/26 より遅い）
      expect(results[1].plannedStartDate!.getTime()).toBeGreaterThan(new Date('2026-05-28').getTime());
    });
  });

  // ====================================
  // 後方互換: オプションなしの呼び出し
  // ====================================
  describe('後方互換', () => {
    it('オプションなしで呼び出した場合、初期計画モードとして動作する', async () => {
      setupAssignee(10, 'user-1');
      taskRepository.findByWbsId.mockResolvedValue([
        createTask({ id: 1, taskNo: 'D1-0001', name: 'タスクA', assigneeId: 10, assigneeName: '田中', yoteiKosu: 7.5 }),
      ]);

      const results = await service.calculateWbsTaskSchedules(wbsId);

      expect(results).toHaveLength(1);
      expect(results[0].plannedStartDate).toEqual(new Date('2026-04-01'));
    });
  });
});
