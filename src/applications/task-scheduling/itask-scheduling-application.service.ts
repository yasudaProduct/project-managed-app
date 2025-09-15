import { TaskSchedulingResult } from '@/domains/task-scheduling/task-scheduling.service';

export interface ITaskSchedulingApplicationService {
  calculateWbsTaskSchedules(wbsId: number): Promise<TaskSchedulingResult[]>;
  convertToTsv(results: TaskSchedulingResult[]): string;
}