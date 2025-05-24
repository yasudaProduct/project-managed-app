import { WbsAssignee } from "@/domains/wbs/wbs-assignee";

export interface IWbsAssigneeRepository {
    findById(id: number): Promise<WbsAssignee | null>;
    findByWbsId(wbsId: number): Promise<WbsAssignee[]>;
    findAll(): Promise<WbsAssignee[]>;
    create(wbsId: number, wbsAssignee: WbsAssignee): Promise<WbsAssignee>;
    update(wbsAssignee: WbsAssignee): Promise<WbsAssignee>;
    delete(id: number): Promise<void>;
}
