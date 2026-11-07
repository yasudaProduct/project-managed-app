/** 定常枠の単位。PER_DAY: 1営業日あたり / PER_MONTH: 1か月あたり（稼働可能時間の比で日別按分） */
export const STEADY_PLAN_UNITS = ["PER_DAY", "PER_MONTH"] as const;
export type SteadyPlanUnit = (typeof STEADY_PLAN_UNITS)[number];

export const STEADY_PLAN_UNIT_LABELS: Record<SteadyPlanUnit, string> = {
    PER_DAY: "h/日",
    PER_MONTH: "h/月",
};

/** 定常枠（Server Action 経由でクライアントへ渡すため日付は ISO 文字列） */
export type SteadyWorkPlanDto = {
    id: number;
    taskId: number;
    unit: SteadyPlanUnit;
    hours: number;
    validFrom: string;
    /** 無期限は null */
    validTo: string | null;
};

/** 定常枠タブの1行（常設プロジェクトのタスクとその定常枠） */
export type SteadyWorkTaskDto = {
    taskId: number;
    taskNo: string;
    name: string;
    assignee: { id: number; userId: string; displayName: string } | null;
    plans: SteadyWorkPlanDto[];
};
