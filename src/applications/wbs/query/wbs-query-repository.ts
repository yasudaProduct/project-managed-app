export interface IWbsQueryRepository {
  getWbsTasks(projectId: string, wbsId: number): Promise<WbsTaskData[]>;
  getPhases(wbsId: number): Promise<PhaseData[]>;
}

export interface WbsTaskData {
  id: string;
  name: string;
  yoteiKosu: number | null;
  jissekiKosu: number | null;
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