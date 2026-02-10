import { IWbsCrossQueryRepository, PhaseHoursSummary } from "../iwbs-cross-query-repository";
import { IWbsTagRepository } from "../iwbs-tag-repository";
import { PhaseCoefficientService, PhaseCoefficient } from "@/domains/wbs/phase-coefficient.service";
import { PhaseProportionService, PhaseProportion } from "@/domains/wbs/phase-proportion.service";

type FilterType = 'wbs' | 'all' | 'tag';

export type CoefficientQuery = {
    filterType: FilterType;
    wbsIds?: number[];
    tagNames?: string[];
    baseTemplateId: number;
    hoursType: 'planned' | 'actual';
};

export type ProportionQuery = {
    filterType: FilterType;
    wbsIds?: number[];
    tagNames?: string[];
    hoursType: 'planned' | 'actual';
    customBaseTemplateIds?: number[];
};

export class WbsAnalyticsHandler {
    constructor(
        private readonly crossQueryRepository: IWbsCrossQueryRepository,
        private readonly tagRepository: IWbsTagRepository,
    ) {}

    async getCoefficients(query: CoefficientQuery): Promise<PhaseCoefficient[]> {
        const wbsIds = await this.resolveWbsIds(query.filterType, query.wbsIds, query.tagNames);

        if (wbsIds !== undefined && wbsIds.length === 0) {
            return [];
        }

        const summaries = await this.crossQueryRepository.getPhaseHoursSummary(wbsIds);
        const phaseHours = this.toPhaseHoursInput(summaries, query.hoursType);

        return PhaseCoefficientService.calculate(phaseHours, query.baseTemplateId);
    }

    async getProportions(query: ProportionQuery): Promise<PhaseProportion[]> {
        const wbsIds = await this.resolveWbsIds(query.filterType, query.wbsIds, query.tagNames);

        if (wbsIds !== undefined && wbsIds.length === 0) {
            return [];
        }

        const summaries = await this.crossQueryRepository.getPhaseHoursSummary(wbsIds);
        const phaseHours = summaries.map(s => ({
            templateId: s.templateId,
            phaseName: s.phaseName,
            phaseCode: s.phaseCode,
            totalHours: query.hoursType === 'planned' ? s.totalPlannedHours : s.totalActualHours,
        }));

        return PhaseProportionService.calculate(phaseHours, query.customBaseTemplateIds);
    }

    private async resolveWbsIds(
        filterType: FilterType,
        wbsIds?: number[],
        tagNames?: string[],
    ): Promise<number[] | undefined> {
        switch (filterType) {
            case 'wbs':
                return wbsIds;
            case 'all':
                return undefined;
            case 'tag':
                if (!tagNames || tagNames.length === 0) return [];
                return this.tagRepository.findWbsIdsByTagNames(tagNames);
        }
    }

    private toPhaseHoursInput(summaries: PhaseHoursSummary[], hoursType: 'planned' | 'actual') {
        return summaries.map(s => ({
            templateId: s.templateId,
            phaseName: s.phaseName,
            phaseCode: s.phaseCode,
            totalHours: hoursType === 'planned' ? s.totalPlannedHours : s.totalActualHours,
            wbsCount: s.wbsCount,
        }));
    }
}
