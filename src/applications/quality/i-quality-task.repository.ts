export interface QualitySyncTaskRow {
  taskNo: string;
  name: string;
  assigneeUserId: string | null;
}

export interface IQualityTaskRepository {
  findAllForQualitySync(wbsId: number): Promise<QualitySyncTaskRow[]>;
  findPhasesByTaskNos(
    wbsId: number,
    taskNos: string[],
  ): Promise<Map<string, string | null>>;
  findAssigneesByTaskNos(
    wbsId: number,
    taskNos: string[],
  ): Promise<Map<string, string | null>>;
  findUserNamesByIds(userIds: string[]): Promise<Map<string, string>>;
}
