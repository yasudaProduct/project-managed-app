import type { ProjectKind } from "@/types/project";

/** WBS 管理画面のタブ */
export const WBS_TAB_KEYS = [
  "summary",
  "list",
  "milestone",
  "table",
  "assignee-gantt",
  "evm",
  "task-scheduling",
  "settings",
  "steady-work",
] as const;
export type WbsTabKey = (typeof WBS_TAB_KEYS)[number];

export type WbsTabsOptions = {
  /** EVM タブを表示するか（案件のみ有効。既定 true） */
  showEvm?: boolean;
};

const PROJECT_TABS: readonly WbsTabKey[] = [
  "summary",
  "list",
  "milestone",
  "table",
  "assignee-gantt",
  "evm",
  "task-scheduling",
  "settings",
];

/** 常設プロジェクトは完了概念を持たないため、EVM・マイルストーン・スケジューリング等を出さない */
const STANDING_TABS: readonly WbsTabKey[] = [
  "summary",
  "list",
  "steady-work",
  "assignee-gantt",
  "settings",
];

/**
 * プロジェクトの種別に応じたタブ構成を返す
 * （docs/plans/non-project-work-management.md §6.6, §11.3）。
 */
export function getWbsTabs(kind: ProjectKind, options: WbsTabsOptions = {}): WbsTabKey[] {
  const showEvm = options.showEvm ?? true;
  if (kind === "STANDING") return [...STANDING_TABS];
  return PROJECT_TABS.filter((tab) => tab !== "evm" || showEvm);
}

/** 要求されたタブが構成に無ければサマリーに戻す */
export function resolveWbsTab(
  kind: ProjectKind,
  requested: string | undefined,
  options: WbsTabsOptions = {}
): WbsTabKey {
  const tabs = getWbsTabs(kind, options);
  return tabs.find((tab) => tab === requested) ?? "summary";
}
