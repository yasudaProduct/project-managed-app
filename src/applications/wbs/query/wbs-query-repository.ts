export interface IWbsQueryRepository {
  getWbsTasks(wbsId: number): Promise<WbsTaskData[]>;
  getPhases(wbsId: number): Promise<PhaseData[]>;
}

export interface WbsTaskData {
  id: string;
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