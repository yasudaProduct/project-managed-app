export type PhaseHoursSummary = {
    templateId: number | null;
    phaseName: string;
    phaseCode: string;
    totalPlannedHours: number;
    totalActualHours: number;
    wbsCount: number;
};

export interface IWbsCrossQueryRepository {
    getPhaseHoursSummary(wbsIds?: number[]): Promise<PhaseHoursSummary[]>;
}
