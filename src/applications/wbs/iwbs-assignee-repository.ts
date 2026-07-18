import { WbsAssignee } from "@/domains/wbs/wbs-assignee";

export interface IWbsAssigneeRepository {
    findById(id: number): Promise<WbsAssignee | null>;
    findByWbsId(wbsId: number): Promise<WbsAssignee[]>;
    /** 複数WBSの担当者を一括取得する（横断負荷計算用途） */
    findByWbsIds(wbsIds: number[]): Promise<WbsAssignee[]>;
    findAll(): Promise<WbsAssignee[]>;
    create(wbsId: number, wbsAssignee: WbsAssignee): Promise<WbsAssignee>;
    update(wbsAssignee: WbsAssignee): Promise<WbsAssignee>;
    delete(id: number): Promise<void>;
}
