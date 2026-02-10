export type PhaseHoursInput = {
    templateId: number | null;
    phaseName: string;
    phaseCode: string;
    totalHours: number;
    wbsCount: number;
};

export type PhaseCoefficient = {
    templateId: number | null;
    phaseName: string;
    phaseCode: string;
    totalHours: number;
    coefficient: number | null;
    wbsCount: number;
    isBase: boolean;
};

export class PhaseCoefficientService {
    static calculate(
        phaseHours: PhaseHoursInput[],
        baseTemplateId: number
    ): PhaseCoefficient[] {
        if (phaseHours.length === 0) return [];

        const basePhase = phaseHours.find(p => p.templateId === baseTemplateId);
        const baseHours = basePhase?.totalHours ?? 0;

        return phaseHours.map(p => ({
            templateId: p.templateId,
            phaseName: p.phaseName,
            phaseCode: p.phaseCode,
            totalHours: p.totalHours,
            coefficient: baseHours > 0 ? p.totalHours / baseHours : null,
            wbsCount: p.wbsCount,
            isBase: p.templateId === baseTemplateId,
        }));
    }
}
