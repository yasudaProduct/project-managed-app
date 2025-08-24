import { Phase } from "@/domains/phase/phase";

export interface IPhaseRepository {
    findById(id: number): Promise<Phase | null>;
    findAll(): Promise<Phase[]>;
    findAllTemplates(): Promise<Phase[]>;
    findByWbsId(wbsId: number): Promise<Phase[]>;
    findPhasesUsedInWbs(wbsId: number): Promise<Phase[]>;
    createTemplate(phase: Phase): Promise<Phase>;
    updateTemplate(phase: Phase): Promise<Phase>;
    create(wbsId: number, phase: Phase): Promise<Phase>;
    update(wbsId: number, id: string, phase: Phase): Promise<Phase>;
    delete(id: string): Promise<void>;
}