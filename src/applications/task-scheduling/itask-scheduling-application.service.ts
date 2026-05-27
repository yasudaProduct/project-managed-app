import { TaskSchedulingResult, TaskSchedulingOptions } from "./task-scheduling-application.service";

export interface ITaskSchedulingApplicationService {
  calculateWbsTaskSchedules(wbsId: number, options?: TaskSchedulingOptions): Promise<TaskSchedulingResult[]>;
  convertToTsv(results: TaskSchedulingResult[]): string;
}