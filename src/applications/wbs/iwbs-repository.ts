import { Wbs } from "@/domains/wbs/wbs";

export interface IWbsRepository {
    findById(id: number): Promise<Wbs | null>;
    findByProjectId(projectId: string): Promise<Wbs[]>;
    findAll(): Promise<Wbs[]>;
    save(wbs: Wbs): Promise<Wbs>;
    create(wbs: Wbs): Promise<Wbs>;
    update(wbs: Wbs): Promise<Wbs>;
    delete(id: number): Promise<void>;
    exists(id: number): Promise<boolean>;
}
