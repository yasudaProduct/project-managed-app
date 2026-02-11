export type PhaseHoursInput = {
    templateId: number | null;
    phaseName: string;
    phaseCode: string;
    totalHours: number;
};

export type PhaseProportion = {
    templateId: number | null;
    phaseName: string;
    phaseCode: string;
    totalHours: number;
    proportion: number;
    customProportion?: number | null;
};

export class PhaseProportionService {
    static calculate(
        phaseHours: PhaseHoursInput[],
        customBaseTemplateIds?: number[]
    ): PhaseProportion[] {
        if (phaseHours.length === 0) return [];

        const grandTotal = phaseHours.reduce((sum, p) => sum + p.totalHours, 0);

        const customTotal = customBaseTemplateIds
            ? phaseHours
                .filter(p => p.templateId !== null && customBaseTemplateIds.includes(p.templateId))
                .reduce((sum, p) => sum + p.totalHours, 0)
            : undefined;

        return phaseHours.map(p => ({
            templateId: p.templateId,
            phaseName: p.phaseName,
            phaseCode: p.phaseCode,
            totalHours: p.totalHours,
            proportion: grandTotal > 0 ? p.totalHours / grandTotal : 0,
            customProportion: customTotal !== undefined
                ? (customTotal > 0 ? p.totalHours / customTotal : null)
                : undefined,
        }));
    }
}
