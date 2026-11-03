import { TaskDelayApplicationService } from '@/applications/task-delay/task-delay-application-service';
import type { ITaskRepository } from '@/applications/task/itask-repository';
import { Task } from '@/domains/task/task';
import { TaskNo } from '@/domains/task/value-object/task-id';
import { TaskStatus } from '@/domains/task/value-object/task-status';
import { Period } from '@/domains/task/period';
import { PeriodType } from '@/domains/task/value-object/period-type';
import { ManHour } from '@/domains/task/man-hour';
import { ManHourType } from '@/domains/task/value-object/man-hour-type';
import { Assignee } from '@/domains/task/assignee';
import { Phase } from '@/domains/phase/phase';
import { PhaseCode } from '@/domains/phase/phase-code';
import type { TaskStatus as TaskStatusType } from '@/types/wbs';

describe('TaskDelayApplicationService', () => {
  // JST 2026-10-31 08:00（UTCでは前日）
  const now = new Date('2026-10-30T23:00:00.000Z');

  const makeTask = (args: {
    id: number;
    status: TaskStatusType;
    start: string;
    end: string;
    assignee?: { id: number; displayName: string };
    phaseName?: string;
    progressRate?: number;
  }): Task =>
    Task.createFromDb({
      id: args.id,
      taskNo: TaskNo.reconstruct(`D1-000${args.id}`),
      wbsId: 1,
      name: `タスク${args.id}`,
      status: new TaskStatus({ status: args.status }),
      assigneeId: args.assignee?.id,
      assignee: args.assignee
        ? Assignee.createFromDb({
            id: args.assignee.id,
            name: args.assignee.displayName,
            displayName: args.assignee.displayName,
          })
        : undefined,
      phase: args.phaseName
        ? Phase.createFromDb({
            id: 10,
            name: args.phaseName,
            code: new PhaseCode('D1'),
            seq: 1,
          })
        : undefined,
      progressRate: args.progressRate,
      periods: [
        Period.create({
          startDate: new Date(`${args.start}T00:00:00.000Z`),
          endDate: new Date(`${args.end}T00:00:00.000Z`),
          type: new PeriodType({ type: 'YOTEI' }),
          manHours: [ManHour.create({ kosu: 10, type: new ManHourType({ type: 'NORMAL' }) })],
        }),
      ],
    });

  let repository: jest.Mocked<Pick<ITaskRepository, 'findActiveByWbsId'>>;
  let service: TaskDelayApplicationService;

  beforeEach(() => {
    repository = { findActiveByWbsId: jest.fn() };
    service = new TaskDelayApplicationService(repository as unknown as ITaskRepository);
  });

  it('遅れ・期限間近のタスクだけを、重い順に返す', async () => {
    repository.findActiveByWbsId.mockResolvedValue([
      makeTask({ id: 1, status: 'IN_PROGRESS', start: '2026-10-01', end: '2026-11-30' }),
      makeTask({ id: 2, status: 'IN_PROGRESS', start: '2026-10-01', end: '2026-10-31' }),
      makeTask({
        id: 3,
        status: 'IN_PROGRESS',
        start: '2026-10-01',
        end: '2026-10-28',
        assignee: { id: 7, displayName: '山田' },
        phaseName: '設計',
        progressRate: 60,
      }),
      makeTask({ id: 4, status: 'NOT_STARTED', start: '2026-10-29', end: '2026-11-20' }),
      makeTask({ id: 5, status: 'COMPLETED', start: '2026-10-01', end: '2026-10-10' }),
    ]);

    const result = await service.listTaskDelays(1, { dueSoonDays: 1, now });

    expect(repository.findActiveByWbsId).toHaveBeenCalledWith(1);
    expect(result.map((r) => [r.taskId, r.kind, r.days])).toEqual([
      [3, 'END_OVERDUE', 3],
      [4, 'START_OVERDUE', 2],
      [2, 'DUE_SOON', 0],
    ]);
    expect(result[0]).toMatchObject({
      taskNo: 'D1-0003',
      taskName: 'タスク3',
      status: 'IN_PROGRESS',
      assigneeId: 7,
      assigneeName: '山田',
      phaseName: '設計',
      progressRate: 60,
      plannedStart: '2026-10-01T00:00:00.000Z',
      plannedEnd: '2026-10-28T00:00:00.000Z',
    });
  });

  it('担当者・フェーズ未設定はnullで返す', async () => {
    repository.findActiveByWbsId.mockResolvedValue([
      makeTask({ id: 1, status: 'IN_PROGRESS', start: '2026-10-01', end: '2026-10-20' }),
    ]);

    const [delay] = await service.listTaskDelays(1, { dueSoonDays: 1, now });

    expect(delay.assigneeId).toBeNull();
    expect(delay.assigneeName).toBeNull();
    expect(delay.phaseName).toBeNull();
  });

  it('前回の確認日を渡すと、それ以降に遅れ始めたタスクに印を付ける', async () => {
    repository.findActiveByWbsId.mockResolvedValue([
      // 10/28 終了予定 → 3日遅れ（前回 10/24 以降に遅れ始めた）
      makeTask({ id: 1, status: 'IN_PROGRESS', start: '2026-10-01', end: '2026-10-28' }),
      // 10/20 終了予定 → 11日遅れ（前回の時点ですでに遅れていた）
      makeTask({ id: 2, status: 'IN_PROGRESS', start: '2026-10-01', end: '2026-10-20' }),
    ]);

    const result = await service.listTaskDelays(1, {
      dueSoonDays: 1,
      now,
      previousReviewDate: new Date('2026-10-24T00:00:00.000Z'),
    });

    expect(result.map((r) => [r.taskId, r.isNewSincePreviousReview])).toEqual([
      [2, false],
      [1, true],
    ]);
  });

  it('前回の確認日がなければ印は付けない', async () => {
    repository.findActiveByWbsId.mockResolvedValue([
      makeTask({ id: 1, status: 'IN_PROGRESS', start: '2026-10-01', end: '2026-10-28' }),
    ]);

    const [delay] = await service.listTaskDelays(1, { dueSoonDays: 1, now });

    expect(delay.isNewSincePreviousReview).toBe(false);
  });
});
