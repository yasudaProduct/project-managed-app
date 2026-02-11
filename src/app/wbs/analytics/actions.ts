'use server';

import { container } from '@/lib/inversify.config';
import { SYMBOL } from '@/types/symbol';
import { WbsAnalyticsHandler, CoefficientQuery, ProportionQuery } from '@/applications/wbs/query/wbs-analytics-handler';
import { IPhaseApplicationService } from '@/applications/phase/phase-application-service';
import { IWbsApplicationService } from '@/applications/wbs/wbs-application-service';
import { IWbsTagApplicationService } from '@/applications/wbs/wbs-tag-application-service';

export async function getCoefficients(query: CoefficientQuery) {
    const handler = container.get<WbsAnalyticsHandler>(SYMBOL.WbsAnalyticsHandler);
    return await handler.getCoefficients(query);
}

export async function getProportions(query: ProportionQuery) {
    const handler = container.get<WbsAnalyticsHandler>(SYMBOL.WbsAnalyticsHandler);
    return await handler.getProportions(query);
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
