import { SteadyWorkPlan } from "@/domains/standing-work/steady-work-plan";

/** 定常枠と、その所属タスクの最小情報（負荷計算用の読み取りモデル） */
export interface SteadyWorkPlanWithTask {
    plan: SteadyWorkPlan;
    task: {
        id: number;
        name: string;
        wbsId: number;
        /** WBS担当者（WbsAssignee）のID。未割当は null */
        assigneeId: number | null;
    };
}

export interface ISteadyWorkPlanRepository {
    findById(id: number): Promise<SteadyWorkPlan | null>;
    /** タスクの定常枠（有効期間の開始日順） */
    findByTaskId(taskId: number): Promise<SteadyWorkPlan[]>;
    /** WBS の有効タスクに属する定常枠（タスクID・有効期間の開始日順） */
    findByWbsId(wbsId: number): Promise<SteadyWorkPlan[]>;
    /**
     * 複数WBSの有効タスクに属する定常枠のうち、有効期間が range と交差するもの
     * （横断負荷計算用途。所属タスクの id・名前・担当者を伴う）
     */
    findActiveByWbsIds(
        wbsIds: number[],
        range: { start: Date; end: Date }
    ): Promise<SteadyWorkPlanWithTask[]>;
    create(plan: SteadyWorkPlan): Promise<SteadyWorkPlan>;
    update(plan: SteadyWorkPlan): Promise<SteadyWorkPlan>;
    delete(id: number): Promise<void>;
}
