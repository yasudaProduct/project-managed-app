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

    async findAll(): Promise<Phase[]> {
        console.log("repository: findAll")
        const phasesDb = await prisma.wbsPhase.findMany({
            orderBy: { seq: 'asc' },
        });

        return phasesDb.map(phaseDb => Phase.createFromDb({
            id: phaseDb.id,
            name: phaseDb.name,
            code: new PhaseCode(phaseDb.code),
            seq: phaseDb.seq,
        }));
    }

    async findAllTemplates(): Promise<Phase[]> {
        console.log("repository: findAllTemplates")
        const phasesDb = await prisma.phaseTemplate.findMany({
            orderBy: { seq: 'asc' },
        });

        return phasesDb.map(phaseDb => Phase.createFromDb({
            id: phaseDb.id,
            name: phaseDb.name,
            code: new PhaseCode(phaseDb.code),
            seq: phaseDb.seq,
        }));
    }

    async findByWbsId(wbsId: number): Promise<Phase[]> {
        console.log("repository: findByWbsId", wbsId)

        // WBSに関連するタスクから使用されているフェーズを取得
        const phasesDb = await prisma.wbsPhase.findMany({
            where: {
                tasks: {
                    some: {
                        wbsId: wbsId
                    }
                }
            },
            orderBy: { seq: 'asc' },
        });

        return phasesDb.map(phaseDb => Phase.createFromDb({
            id: phaseDb.id,
            name: phaseDb.name,
            code: new PhaseCode(phaseDb.code),
            seq: phaseDb.seq,
        }));
    }

    async createTemplate(phase: Phase): Promise<Phase> {
        console.log("repository: createTemplate")
        const phaseDb = await prisma.phaseTemplate.create({
            data: {
                name: phase.name,
                code: phase.code.value(),
                seq: phase.seq,
            },
        });
        return Phase.createFromDb({
            id: phaseDb.id,
            name: phaseDb.name,
            code: new PhaseCode(phaseDb.code),
            seq: phaseDb.seq,
        });
    }

    async updateTemplate(phase: Phase): Promise<Phase> {
        console.log("repository: updateTemplate")
        const phaseDb = await prisma.phaseTemplate.update({
            where: { id: phase.id },
            data: {
                name: phase.name,
                code: phase.code.value(),
                seq: phase.seq,
            },
        });
        return Phase.createFromDb({
            id: phaseDb.id,
            name: phaseDb.name,
            code: new PhaseCode(phaseDb.code),
            seq: phaseDb.seq,
        });
    }
}
