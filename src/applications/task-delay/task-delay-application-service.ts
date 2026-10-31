import { inject, injectable } from 'inversify';
import { SYMBOL } from '@/types/symbol';
import type { TaskStatus } from '@/types/wbs';
import type { TaskDelayKind } from '@/types/task-delay';
import { calendarDateInTimeZone } from '@/utils/date-util';
import { detectTaskDelay, compareTaskDelays } from '@/domains/task/task-delay';
import type { ITaskRepository } from '@/applications/task/itask-repository';

/** 遅延タスク一覧の1行（Server Action 経由でクライアントへ渡すため日付は ISO 文字列） */
export type TaskDelayDto = {
  taskId: number;
  taskNo: string;
  taskName: string;
  status: TaskStatus;
  assigneeId: number | null;
  assigneeName: string | null;
  phaseName: string | null;
  plannedStart: string | null;
  plannedEnd: string | null;
  progressRate: number | null;
  kind: TaskDelayKind;
  /** 遅れは遅延日数、期限間近は予定終了日までの残日数（本日=0） */
  days: number;
};

export type ListTaskDelaysOptions = {
  /** 予定終了日の何日前から期限間近とするか（プロジェクト設定 deadlineAlertDays） */
  dueSoonDays: number;
  now?: Date;
};

export interface ITaskDelayApplicationService {
  listTaskDelays(wbsId: number, options: ListTaskDelaysOptions): Promise<TaskDelayDto[]>;
}

@injectable()
export class TaskDelayApplicationService implements ITaskDelayApplicationService {
  constructor(
    @inject(SYMBOL.ITaskRepository)
    private readonly taskRepository: ITaskRepository
  ) {}

  public async listTaskDelays(
    wbsId: number,
    options: ListTaskDelaysOptions
  ): Promise<TaskDelayDto[]> {
    const today = calendarDateInTimeZone(options.now ?? new Date());
    const tasks = await this.taskRepository.findActiveByWbsId(wbsId);

    const delays: TaskDelayDto[] = [];
    for (const task of tasks) {
      if (task.id === undefined) continue;
      const plannedStart = task.getYoteiStart() ?? null;
      const plannedEnd = task.getYoteiEnd() ?? null;
      const status = task.getStatus();
      const delay = detectTaskDelay(
        { status, plannedStart, plannedEnd },
        today,
        options.dueSoonDays
      );
      if (!delay) continue;

      delays.push({
        taskId: task.id,
        taskNo: task.taskNo.getValue(),
        taskName: task.name,
        status,
        assigneeId: task.assignee?.id ?? null,
        assigneeName: task.assignee?.displayName ?? null,
        phaseName: task.phase?.name ?? null,
        plannedStart: plannedStart?.toISOString() ?? null,
        plannedEnd: plannedEnd?.toISOString() ?? null,
        progressRate: task.progressRate ?? null,
        kind: delay.kind,
        days: delay.days,
      });
    }

    return delays.sort(compareTaskDelays);
  }
}
