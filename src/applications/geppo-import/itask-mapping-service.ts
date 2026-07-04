export type TaskMappingEntry = {
  projectId: string;
  wbsNo: string;
  wbsId: number;
};

export function buildTaskMapKey(projectId: string, wbsNo: string): string {
  return `${projectId}::${wbsNo}`;
}

export interface ITaskMappingService {
  createTaskMap(entries: TaskMappingEntry[]): Promise<Map<string, number>>;
  validateTaskMapping(entries: TaskMappingEntry[]): Promise<{
    totalTasks: number;
    mappedTasks: number;
    unmappedTasks: string[];
    mappingRate: number;
  }>;
}
