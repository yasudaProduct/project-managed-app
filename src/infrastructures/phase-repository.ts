import { IPhaseRepository } from "@/applications/task/iphase-repository";
import { Phase } from "@/domains/phase/phase";
import { PhaseCode } from "@/domains/phase/phase-code";
import prisma from "@/lib/prisma";
import { injectable } from "inversify";

@injectable()
export class PhaseRepository implements IPhaseRepository {

    async findById(id: number): Promise<Phase | null> {
        console.log("repository: findById")
        const phaseDb = await prisma.wbsPhase.findUnique({
            where: { id: id },
        });

        if (!phaseDb) return null;
        return Phase.createFromDb({
            id: phaseDb.id,
            name: phaseDb.name,
            code: new PhaseCode(phaseDb.code),
            seq: phaseDb.seq,
        });
    }
}
