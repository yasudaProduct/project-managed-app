/** 定常枠の単位。PER_DAY: 1営業日あたり / PER_MONTH: 1か月あたり（稼働可能時間の比で日別按分） */
export const STEADY_PLAN_UNITS = ["PER_DAY", "PER_MONTH"] as const;
export type SteadyPlanUnit = (typeof STEADY_PLAN_UNITS)[number];

export const STEADY_PLAN_UNIT_LABELS: Record<SteadyPlanUnit, string> = {
    PER_DAY: "h/日",
    PER_MONTH: "h/月",
};
