import { StandingWorkApplicationService } from '@/applications/standing-work/standing-work-application-service';
import type { ISteadyWorkPlanRepository } from '@/applications/standing-work/isteady-work-plan-repository';
import type { ITaskRepository } from '@/applications/task/itask-repository';
import type { IPhaseRepository } from '@/applications/task/iphase-repository';
import type { IWbsRepository } from '@/applications/wbs/iwbs-repository';
import type { IWbsAssigneeRepository } from '@/applications/wbs/iwbs-assignee-repository';
import type { IProjectRepository } from '@/applications/projects/iproject-repository';
import type { ITaskFactory } from '@/domains/task/interfaces/task-factory';
import { SteadyWorkPlan } from '@/domains/standing-work/steady-work-plan';
import { Task } from '@/domains/task/task';
import { TaskNo } from '@/domains/task/value-object/task-id';
import { TaskStatus } from '@/domains/task/value-object/task-status';
import { Assignee } from '@/domains/task/assignee';
import { Phase } from '@/domains/phase/phase';
import { PhaseCode } from '@/domains/phase/phase-code';
import { Project } from '@/domains/project/project';
import { ProjectStatus } from '@/domains/project/project-status';
import { Wbs } from '@/domains/wbs/wbs';
import { WbsAssignee } from '@/domains/wbs/wbs-assignee';

/**
 * 常設プロジェクトの定常タスク・定常枠（docs/plans/non-project-work-management.md §11.3）。
 * - 定常タスクは常設プロジェクトのWBSにだけ追加できる。工程が無ければ既定の工程「定常」を作る
 * - 定常枠は担当者のいる常設タスクにだけ設定でき、同じタスクの枠は有効期間が重ならない
 */
describe('StandingWorkApplicationService', () => {
  const d = (ymd: string) => new Date(`${ymd}T00:00:00.000Z`);
  const STANDING_WBS_ID = 5;
  const PROJECT_WBS_ID = 6;

  const standingProject = Project.createFromDb({
    id: 'p-standing',
    name: '社内業務',
    status: new ProjectStatus({ status: 'ACTIVE' }),
    startDate: d('2026-04-01'),
    endDate: d('2027-03-31'),
    kind: 'STANDING',
    category: 'INTERNAL',
  });
  const caseProject = Project.createFromDb({
    id: 'p-case',
    name: '案件A',
    status: new ProjectStatus({ status: 'ACTIVE' }),
    startDate: d('2026-04-01'),
    endDate: d('2027-03-31'),
  });

  const makeTask = (args: { id: number; wbsId: number; assigneeId?: number; name?: string }) =>
    Task.createFromDb({
      id: args.id,
      taskNo: TaskNo.reconstruct(`STD-${args.id}`),
      wbsId: args.wbsId,
      name: args.name ?? `定常タスク${args.id}`,
      status: new TaskStatus({ status: 'NOT_STARTED' }),
      assigneeId: args.assigneeId,
      assignee:
        args.assigneeId !== undefined
          ? Assignee.createFromDb({ id: args.assigneeId, name: 'yamada', displayName: '山田', userId: 'user-1' })
          : undefined,
    });

  const makePlan = (args: { id: number; taskId: number; from: string; to?: string; hours?: number }) =>
    SteadyWorkPlan.createFromDb({
      id: args.id,
      taskId: args.taskId,
      unit: 'PER_DAY',
      hours: args.hours ?? 1,
      validFrom: d(args.from),
      validTo: args.to ? d(args.to) : undefined,
    });

  let steadyWorkPlanRepository: jest.Mocked<ISteadyWorkPlanRepository>;
  let taskRepository: { findById: jest.Mock; findActiveByWbsId: jest.Mock; create: jest.Mock };
  let phaseRepository: { findByWbsId: jest.Mock; create: jest.Mock };
  let wbsRepository: { findById: jest.Mock };
  let wbsAssigneeRepository: { findById: jest.Mock };
  let projectRepository: { findById: jest.Mock };
  let taskFactory: { createTaskId: jest.Mock };
  let service: StandingWorkApplicationService;

  beforeEach(() => {
    steadyWorkPlanRepository = {
      findById: jest.fn().mockResolvedValue(null),
      findByTaskId: jest.fn().mockResolvedValue([]),
      findByWbsId: jest.fn().mockResolvedValue([]),
      findActiveByWbsIds: jest.fn().mockResolvedValue([]),
      create: jest.fn().mockImplementation(async (plan: SteadyWorkPlan) =>
        SteadyWorkPlan.createFromDb({
          id: 99,
          taskId: plan.taskId,
          unit: plan.unit,
          hours: plan.hours,
          validFrom: plan.validFrom,
          validTo: plan.validTo,
        })
      ),
      update: jest.fn().mockImplementation(async (plan: SteadyWorkPlan) => plan),
      delete: jest.fn().mockResolvedValue(undefined),
    };
    taskRepository = {
      findById: jest.fn().mockResolvedValue(null),
      findActiveByWbsId: jest.fn().mockResolvedValue([]),
      create: jest.fn().mockImplementation(async (task: Task) =>
        Task.createFromDb({
          id: 77,
          taskNo: task.taskNo,
          wbsId: task.wbsId,
          name: task.name,
          status: task.status,
          assigneeId: task.assigneeId,
          phaseId: task.phaseId,
        })
      ),
    };
    phaseRepository = {
      findByWbsId: jest.fn().mockResolvedValue([]),
      create: jest.fn().mockImplementation(async (_wbsId: number, phase: Phase) =>
        Phase.createFromDb({ id: 31, name: phase.name, code: phase.code, seq: phase.seq })
      ),
    };
    wbsRepository = {
      findById: jest.fn().mockImplementation(async (id: number) =>
        id === STANDING_WBS_ID
          ? Wbs.createFromDb({ id: STANDING_WBS_ID, name: '社内業務', projectId: 'p-standing' })
          : id === PROJECT_WBS_ID
            ? Wbs.createFromDb({ id: PROJECT_WBS_ID, name: '案件A', projectId: 'p-case' })
            : null
      ),
    };
    wbsAssigneeRepository = {
      findById: jest.fn().mockImplementation(async (id: number) =>
        id === 300
          ? WbsAssignee.createFromDb({ id: 300, wbsId: STANDING_WBS_ID, userId: 'user-1', userName: '山田', rate: 1, costPerHour: 5000, seq: 1 })
          : id === 600
            ? WbsAssignee.createFromDb({ id: 600, wbsId: PROJECT_WBS_ID, userId: 'user-2', userName: '佐藤', rate: 1, costPerHour: 5000, seq: 1 })
            : null
      ),
    };
    projectRepository = {
      findById: jest.fn().mockImplementation(async (id: string) =>
        id === 'p-standing' ? standingProject : id === 'p-case' ? caseProject : null
      ),
    };
    taskFactory = { createTaskId: jest.fn().mockResolvedValue(TaskNo.reconstruct('STD-1')) };

    service = new StandingWorkApplicationService(
      steadyWorkPlanRepository,
      taskRepository as unknown as ITaskRepository,
      phaseRepository as unknown as IPhaseRepository,
      wbsRepository as unknown as IWbsRepository,
      wbsAssigneeRepository as unknown as IWbsAssigneeRepository,
      projectRepository as unknown as IProjectRepository,
      taskFactory as unknown as ITaskFactory
    );
  });

  describe('listSteadyWorkTasks', () => {
    it('WBSの有効タスクに担当者と定常枠（ISO日付）を付けて返す', async () => {
      taskRepository.findActiveByWbsId.mockResolvedValue([
        makeTask({ id: 1, wbsId: STANDING_WBS_ID, assigneeId: 300, name: '保守対応' }),
        makeTask({ id: 2, wbsId: STANDING_WBS_ID }),
      ]);
      steadyWorkPlanRepository.findByWbsId.mockResolvedValue([
        makePlan({ id: 10, taskId: 1, from: '2026-04-01', to: '2026-09-30', hours: 2 }),
        makePlan({ id: 11, taskId: 1, from: '2026-10-01' }),
      ]);

      const result = await service.listSteadyWorkTasks(STANDING_WBS_ID);

      expect(taskRepository.findActiveByWbsId).toHaveBeenCalledWith(STANDING_WBS_ID);
      expect(steadyWorkPlanRepository.findByWbsId).toHaveBeenCalledWith(STANDING_WBS_ID);
      expect(result).toEqual([
        {
          taskId: 1,
          taskNo: 'STD-1',
          name: '保守対応',
          assignee: { id: 300, userId: 'user-1', displayName: '山田' },
          plans: [
            { id: 10, taskId: 1, unit: 'PER_DAY', hours: 2, validFrom: '2026-04-01T00:00:00.000Z', validTo: '2026-09-30T00:00:00.000Z' },
            { id: 11, taskId: 1, unit: 'PER_DAY', hours: 1, validFrom: '2026-10-01T00:00:00.000Z', validTo: null },
          ],
        },
        { taskId: 2, taskNo: 'STD-2', name: '定常タスク2', assignee: null, plans: [] },
      ]);
    });
  });

  describe('createSteadyWorkTask', () => {
    it('常設プロジェクトのWBSに、工程の先頭を使って期間なしの定常タスクを作る', async () => {
      phaseRepository.findByWbsId.mockResolvedValue([
        Phase.createFromDb({ id: 21, name: '定常', code: new PhaseCode('STD'), seq: 1 }),
      ]);

      const result = await service.createSteadyWorkTask({ wbsId: STANDING_WBS_ID, name: '保守対応', assigneeId: 300 });

      expect(result).toEqual({ success: true, id: 77 });
      expect(taskFactory.createTaskId).toHaveBeenCalledWith(STANDING_WBS_ID, 21);
      expect(phaseRepository.create).not.toHaveBeenCalled();
      const created: Task = taskRepository.create.mock.calls[0][0];
      expect(created.name).toBe('保守対応');
      expect(created.wbsId).toBe(STANDING_WBS_ID);
      expect(created.phaseId).toBe(21);
      expect(created.assigneeId).toBe(300);
      expect(created.getStatus()).toBe('NOT_STARTED');
      expect(created.getYoteiStart()).toBeUndefined();
      expect(created.getYoteiKosus()).toBeUndefined();
    });

    it('工程が無ければ既定の工程「定常」（コード STD）を作ってから定常タスクを作る', async () => {
      const result = await service.createSteadyWorkTask({ wbsId: STANDING_WBS_ID, name: '社内雑務' });

      expect(result.success).toBe(true);
      expect(phaseRepository.create).toHaveBeenCalledTimes(1);
      const [wbsId, phase] = phaseRepository.create.mock.calls[0] as [number, Phase];
      expect(wbsId).toBe(STANDING_WBS_ID);
      expect(phase.name).toBe('定常');
      expect(phase.code.value()).toBe('STD');
      expect(taskFactory.createTaskId).toHaveBeenCalledWith(STANDING_WBS_ID, 31);
      const created: Task = taskRepository.create.mock.calls[0][0];
      expect(created.phaseId).toBe(31);
      expect(created.assigneeId).toBeUndefined();
    });

    it('案件のWBSには定常タスクを追加できない', async () => {
      const result = await service.createSteadyWorkTask({ wbsId: PROJECT_WBS_ID, name: '保守対応' });

      expect(result).toEqual({ success: false, error: '常設プロジェクトのWBSにのみ定常タスクを追加できます' });
      expect(taskRepository.create).not.toHaveBeenCalled();
    });

    it('存在しないWBSにはエラーを返す', async () => {
      const result = await service.createSteadyWorkTask({ wbsId: 999, name: '保守対応' });

      expect(result).toEqual({ success: false, error: 'WBSが見つかりません' });
    });

    it('他のWBSの担当者は指定できない', async () => {
      const result = await service.createSteadyWorkTask({ wbsId: STANDING_WBS_ID, name: '保守対応', assigneeId: 600 });

      expect(result).toEqual({ success: false, error: '担当者がWBSに存在しません' });
      expect(taskRepository.create).not.toHaveBeenCalled();
    });
  });

  describe('createSteadyWorkPlan', () => {
    beforeEach(() => {
      taskRepository.findById.mockImplementation(async (id: number) =>
        id === 1
          ? makeTask({ id: 1, wbsId: STANDING_WBS_ID, assigneeId: 300 })
          : id === 2
            ? makeTask({ id: 2, wbsId: STANDING_WBS_ID })
            : id === 3
              ? makeTask({ id: 3, wbsId: PROJECT_WBS_ID, assigneeId: 600 })
              : null
      );
    });

    it('担当者のいる常設タスクに定常枠を作成し、IDを返す', async () => {
      const result = await service.createSteadyWorkPlan({
        taskId: 1,
        unit: 'PER_MONTH',
        hours: 20,
        validFrom: d('2026-04-01'),
      });

      expect(result).toEqual({ success: true, id: 99 });
      const created: SteadyWorkPlan = steadyWorkPlanRepository.create.mock.calls[0][0];
      expect(created.taskId).toBe(1);
      expect(created.unit).toBe('PER_MONTH');
      expect(created.hours).toBe(20);
      expect(created.validFrom).toEqual(d('2026-04-01'));
      expect(created.validTo).toBeUndefined();
    });

    it('既存の枠と有効期間が重なる場合はエラーを返す', async () => {
      steadyWorkPlanRepository.findByTaskId.mockResolvedValue([
        makePlan({ id: 10, taskId: 1, from: '2026-04-01', to: '2026-09-30' }),
      ]);

      const result = await service.createSteadyWorkPlan({
        taskId: 1,
        unit: 'PER_DAY',
        hours: 1,
        validFrom: d('2026-09-30'),
      });

      expect(result).toEqual({ success: false, error: '定常枠の有効期間が重なっています' });
      expect(steadyWorkPlanRepository.create).not.toHaveBeenCalled();
    });

    it('既存の枠の翌日から始まる枠は作成できる', async () => {
      steadyWorkPlanRepository.findByTaskId.mockResolvedValue([
        makePlan({ id: 10, taskId: 1, from: '2026-04-01', to: '2026-09-30' }),
      ]);

      const result = await service.createSteadyWorkPlan({
        taskId: 1,
        unit: 'PER_DAY',
        hours: 1,
        validFrom: d('2026-10-01'),
      });

      expect(result.success).toBe(true);
    });

    it('存在しないタスクにはエラーを返す', async () => {
      const result = await service.createSteadyWorkPlan({ taskId: 999, unit: 'PER_DAY', hours: 1, validFrom: d('2026-04-01') });

      expect(result).toEqual({ success: false, error: 'タスクが見つかりません' });
    });

    it('案件のタスクには定常枠を設定できない', async () => {
      const result = await service.createSteadyWorkPlan({ taskId: 3, unit: 'PER_DAY', hours: 1, validFrom: d('2026-04-01') });

      expect(result).toEqual({ success: false, error: '定常枠は常設プロジェクトのタスクにのみ設定できます' });
    });

    it('担当者のいないタスクには定常枠を設定できない', async () => {
      const result = await service.createSteadyWorkPlan({ taskId: 2, unit: 'PER_DAY', hours: 1, validFrom: d('2026-04-01') });

      expect(result).toEqual({ success: false, error: '担当者が設定されていないタスクには定常枠を設定できません' });
    });

    it('ドメインの不変条件に反する入力はエラーメッセージを返す', async () => {
      const result = await service.createSteadyWorkPlan({
        taskId: 1,
        unit: 'PER_DAY',
        hours: 1,
        validFrom: d('2026-05-01'),
        validTo: d('2026-04-01'),
      });

      expect(result).toEqual({ success: false, error: '定常枠の開始日は終了日以前にしてください' });
    });
  });

  describe('updateSteadyWorkPlan', () => {
    beforeEach(() => {
      steadyWorkPlanRepository.findById.mockImplementation(async (id: number) =>
        id === 10 ? makePlan({ id: 10, taskId: 1, from: '2026-04-01', to: '2026-09-30' }) : null
      );
      steadyWorkPlanRepository.findByTaskId.mockResolvedValue([
        makePlan({ id: 10, taskId: 1, from: '2026-04-01', to: '2026-09-30' }),
        makePlan({ id: 11, taskId: 1, from: '2026-10-01' }),
      ]);
    });

    it('自分以外の枠と重ならなければ更新できる', async () => {
      const result = await service.updateSteadyWorkPlan({
        id: 10,
        unit: 'PER_MONTH',
        hours: 30,
        validFrom: d('2026-05-01'),
        validTo: d('2026-09-30'),
      });

      expect(result).toEqual({ success: true });
      const updated: SteadyWorkPlan = steadyWorkPlanRepository.update.mock.calls[0][0];
      expect(updated.id).toBe(10);
      expect(updated.taskId).toBe(1);
      expect(updated.unit).toBe('PER_MONTH');
      expect(updated.hours).toBe(30);
      expect(updated.validFrom).toEqual(d('2026-05-01'));
    });

    it('他の枠と重なる更新はエラーを返す', async () => {
      const result = await service.updateSteadyWorkPlan({
        id: 10,
        unit: 'PER_DAY',
        hours: 1,
        validFrom: d('2026-04-01'),
        validTo: d('2026-10-01'),
      });

      expect(result).toEqual({ success: false, error: '定常枠の有効期間が重なっています' });
      expect(steadyWorkPlanRepository.update).not.toHaveBeenCalled();
    });

    it('存在しない枠にはエラーを返す', async () => {
      const result = await service.updateSteadyWorkPlan({ id: 999, unit: 'PER_DAY', hours: 1, validFrom: d('2026-04-01') });

      expect(result).toEqual({ success: false, error: '定常枠が見つかりません' });
    });
  });

  describe('deleteSteadyWorkPlan', () => {
    it('存在する枠を削除する', async () => {
      steadyWorkPlanRepository.findById.mockResolvedValue(makePlan({ id: 10, taskId: 1, from: '2026-04-01' }));

      const result = await service.deleteSteadyWorkPlan(10);

      expect(result).toEqual({ success: true });
      expect(steadyWorkPlanRepository.delete).toHaveBeenCalledWith(10);
    });

    it('存在しない枠にはエラーを返す', async () => {
      const result = await service.deleteSteadyWorkPlan(999);

      expect(result).toEqual({ success: false, error: '定常枠が見つかりません' });
      expect(steadyWorkPlanRepository.delete).not.toHaveBeenCalled();
    });
  });
});
