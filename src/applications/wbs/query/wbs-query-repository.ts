export interface IWbsQueryRepository {
  getWbsTasks(projectId: string, wbsId: string): Promise<WbsTaskData[]>;
  getPhases(wbsId: string): Promise<PhaseData[]>;
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