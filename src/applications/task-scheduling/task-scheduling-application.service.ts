import { inject, injectable } from 'inversify';
import { SYMBOL } from '@/types/symbol';
import type { IWbsRepository } from '../wbs/iwbs-repository';
import type { ITaskRepository } from '../task/itask-repository';
import { TaskSchedulingService, TaskSchedulingResult } from '@/domains/task-scheduling/task-scheduling.service';
import { ITaskSchedulingApplicationService } from './itask-scheduling-application.service';
import type { IProjectRepository } from '../projects/iproject-repository';

@injectable()
export class TaskSchedulingApplicationService implements ITaskSchedulingApplicationService {
  constructor(
    @inject(SYMBOL.IWbsRepository) private wbsRepository: IWbsRepository,
    @inject(SYMBOL.ITaskRepository) private taskRepository: ITaskRepository,
    @inject(SYMBOL.TaskSchedulingService) private taskSchedulingService: TaskSchedulingService,
    @inject(SYMBOL.IProjectRepository) private projectRepository: IProjectRepository,
  ) { }

  /**
   * WBSのタスクスケジュールを計算
   * @param wbsId WBS ID
   * @returns スケジューリング結果
   */
  async calculateWbsTaskSchedules(wbsId: number): Promise<TaskSchedulingResult[]> {
    // WBSを取得
    const wbs = await this.wbsRepository.findById(wbsId);
    if (!wbs) {
      throw new Error('WBSが見つかりません');
    }

    if (!wbs.projectId) {
      throw new Error('WBSに紐付くプロジェクトが見つかりません');
    }

    const project = await this.projectRepository.findById(wbs.projectId);
    if (!project) {
      throw new Error('プロジェクトが見つかりません');
    }

    const projectStartDate = project.startDate;
    if (!projectStartDate) {
      throw new Error('プロジェクトの基準開始日が設定されていません');
    }

    // WBSに紐付くタスクを取得
    const tasks = await this.taskRepository.findByWbsId(wbsId);

    // タスク番号でソート（前詰めのため）
    const sortedTasks = tasks.sort((a, b) => {
      return a.taskNo.getValue().localeCompare(b.taskNo.getValue());
    });

    // スケジューリングを実行
    const results = await this.taskSchedulingService.calculateTaskSchedules(
      sortedTasks,
      projectStartDate
    );

    return results;
  }

  /**
   * スケジューリング結果をTSV形式に変換
   */
  convertToTsv(results: TaskSchedulingResult[]): string {
    return this.taskSchedulingService.convertToTsv(results);
  }
}