import { ProjectStatus } from "./wbs";

/** プロジェクトの種別。案件（開始・終了が決まった案件）/ 常設（定常・不定期作業の受け皿） */
export const PROJECT_KINDS = ["PROJECT", "STANDING"] as const;
export type ProjectKind = (typeof PROJECT_KINDS)[number];

export const PROJECT_KIND_LABELS: Record<ProjectKind, string> = {
    PROJECT: "案件",
    STANDING: "常設",
};

/** 常設プロジェクトの分類（集計・表示用） */
export const STANDING_CATEGORIES = ["MAINTENANCE", "INTERNAL", "OTHER"] as const;
export type StandingCategory = (typeof STANDING_CATEGORIES)[number];

export const STANDING_CATEGORY_LABELS: Record<StandingCategory, string> = {
    MAINTENANCE: "保守",
    INTERNAL: "社内",
    OTHER: "その他",
};

export type Project = {
    id: string;
    name: string;
    status: ProjectStatus;
    description?: string;
    startDate: Date;
    endDate: Date;
    kind: ProjectKind;
    category?: StandingCategory;
}
