export interface ReviewTaskInfo {
  taskNo: string;
  tanto: string;
}

export interface TaskWithReviewInfo {
  taskNo: string;
  wbsId: number;
  name: string;
  tantoRev: string | null;
  reviewTasks: ReviewTaskInfo[];
}

export interface IQualityTaskRepository {
  findByWbsIdWithReviewInfo(wbsId: number): Promise<TaskWithReviewInfo[]>;
  resolveUserIdByName(wbsId: number, name: string): Promise<string | null>;
  findPhasesByTaskNos(
    wbsId: number,
    taskNos: string[],
  ): Promise<Map<string, string | null>>;
}
