/** 横断負荷計算の対象WBS情報(プロジェクト×最新WBSの射影) */
export interface TargetWbsInfo {
  wbsId: number;
  wbsName: string;
  projectId: string;
  projectName: string;
}

export interface ITargetWbsQueryRepository {
  /**
   * 未開始(INACTIVE)・進行中(ACTIVE)プロジェクトの最新WBS
   * (createdAt desc, id desc の先頭)をプロジェクトごとに1件返す。
   * WBSを持たないプロジェクトは含めない。
   */
  findTargetWbs(): Promise<TargetWbsInfo[]>;
}
