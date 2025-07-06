import { Phase } from "@/domains/phase/phase";

export interface IPhaseRepository {
    findById(id: number): Promise<Phase | null>;
    findAll(): Promise<Phase[]>;
    findByWbsId(wbsId: number): Promise<Phase[]>;
    // create(phase: Phase): Promise<Phase>;
    // update(wbsId: number, id: string, phase: Phase): Promise<Phase>;
    // delete(id: string): Promise<void>;
}