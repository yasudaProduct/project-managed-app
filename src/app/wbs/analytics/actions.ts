'use server';

import { container } from '@/lib/inversify.config';
import { SYMBOL } from '@/types/symbol';
import type { IWbsAnalyticsApplicationService, CoefficientQuery, ProportionQuery } from '@/applications/wbs/wbs-analytics-application-service';
import { IPhaseApplicationService } from '@/applications/phase/phase-application-service';
import { IWbsApplicationService } from '@/applications/wbs/wbs-application-service';
import { IWbsTagApplicationService } from '@/applications/wbs/wbs-tag-application-service';

export async function getCoefficients(query: CoefficientQuery) {
    const service = container.get<IWbsAnalyticsApplicationService>(SYMBOL.IWbsAnalyticsApplicationService);
    return await service.getCoefficients(query);
}

export async function getProportions(query: ProportionQuery) {
    const service = container.get<IWbsAnalyticsApplicationService>(SYMBOL.IWbsAnalyticsApplicationService);
    return await service.getProportions(query);
}

export async function getPhaseTemplates() {
    const phaseService = container.get<IPhaseApplicationService>(SYMBOL.IPhaseApplicationService);
    return await phaseService.getAllPhaseTemplates();
}

export async function getAllWbs() {
    const wbsService = container.get<IWbsApplicationService>(SYMBOL.IWbsApplicationService);
    return await wbsService.getWbsAll();
}

export async function getAllTagNames() {
    const tagService = container.get<IWbsTagApplicationService>(SYMBOL.IWbsTagApplicationService);
    return await tagService.getAllTagNames();
}
