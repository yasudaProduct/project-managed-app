"use server";

import { container } from "@/lib/inversify.config";
import { SYMBOL } from "@/types/symbol";
import { IWbsApplicationService } from "@/applications/wbs/wbs-application-service";
import { IPhaseRepository } from "@/applications/task/iphase-repository";

export async function getWbsAssignees(wbsId: number) {
    const wbsService = container.get<IWbsApplicationService>(SYMBOL.IWbsApplicationService);
    return await wbsService.getAssignees(wbsId);
}

export async function getAllPhases() {
    const phaseRepository = container.get<IPhaseRepository>(SYMBOL.IPhaseRepository);
    const phases = await phaseRepository.findAll();
    return phases.map(phase => ({
        id: phase.id!,
        name: phase.name,
        code: phase.code.value()
    }));
}

export async function getWbsPhases(wbsId: number) {
    const phaseRepository = container.get<IPhaseRepository>(SYMBOL.IPhaseRepository);
    const phases = await phaseRepository.findByWbsId(wbsId);
    return phases.map(phase => ({
        id: phase.id!,
        name: phase.name,
        code: phase.code.value()
    }));
}