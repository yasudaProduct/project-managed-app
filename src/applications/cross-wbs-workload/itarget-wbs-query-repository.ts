import type { ProjectKind } from "@/types/project";

/** 横断負荷計算の対象WBS情報(プロジェクト×最新WBSの射影) */
export interface TargetWbsInfo {
  wbsId: number;
  wbsName: string;
  projectId: string;
  projectName: string;
}

export interface FindTargetWbsOptions {
  /** プロジェクトの種別で絞る。未指定は案件・常設の両方 */
  kinds?: ReadonlyArray<ProjectKind>;
}

export interface ITargetWbsQueryRepository {
  /**
   * 未開始(INACTIVE)・進行中(ACTIVE)プロジェクトの最新WBS
   * (createdAt desc, id desc の先頭)をプロジェクトごとに1件返す。
   * WBSを持たないプロジェクトは含めない。
   * 案件の分析（ポートフォリオ・通知など）は kinds: ['PROJECT'] で常設を除く。
   */
  findTargetWbs(options?: FindTargetWbsOptions): Promise<TargetWbsInfo[]>;
}
