import { TaskSchedulingResult } from "./task-scheduling-application.service";

export interface ITaskSchedulingApplicationService {
  calculateWbsTaskSchedules(wbsId: number): Promise<TaskSchedulingResult[]>;
  convertToTsv(results: TaskSchedulingResult[]): string;
}