export interface IWbsQueryRepository {
  getWbsTasks(wbsId: number): Promise<WbsTaskData[]>;
  getPhases(wbsId: number): Promise<PhaseData[]>;
  /**
   * 指定 WBS 配下のタスクについて、work_records を
   * (taskId, userId, yearMonth) 単位で集約した実績工数を返す。
   * 月別・担当者別／月別・工程別集計の「実績」列を
   * 実作業月・実作業者ベースで算出するために使用する。
   */
  getTaskActualHoursByMonth(wbsId: number): Promise<TaskActualMonthly[]>;
  /**
   * 指定 WBS 配下で、タスクに紐付いていない（taskId が null の）作業実績件数を返す。
   */
  getUnlinkedWorkRecordsCount(wbsId: number): Promise<number>;
}

export interface TaskActualMonthly {
  taskId: string;
  userId: string;
  userDisplayName: string;
  /** "YYYY/MM" */
  yearMonth: string;
  hoursWorked: number;
}

export interface WbsTaskData {
  id: string;
  no: string;
  name: string;
  kijunKosu: number | null;
  yoteiKosu: number | null;
  jissekiKosu: number | null;
  kijunStart: Date | null;
  kijunEnd: Date | null;
  yoteiStart: Date | null;
  yoteiEnd: Date | null;
  jissekiStart: Date | null;
  jissekiEnd: Date | null;
  progressRate: number | null;
  status: string;
  phase: {
    id: number;
    name: string;
  } | null;
  assignee: {
    id: string;
    displayName: string;
  } | null;
}

export interface PhaseData {
  id: number;
  name: string;
  seq: number;
}