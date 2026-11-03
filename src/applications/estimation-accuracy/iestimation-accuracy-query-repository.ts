/** 見積精度の集計元になる完了タスク1件（基準工数・実績工数は時間） */
export type CompletedTaskEstimate = {
  projectId: string;
  projectName: string;
  phaseId: number | null;
  phaseName: string | null;
  phaseTemplateId: number | null;
  phaseTemplateName: string | null;
  /** 基準（KIJUN）の通常工数。基準未設定なら予定（YOTEI）の通常工数（EVMのBACと同じ扱い） */
  baselineHours: number;
  /** タスクに紐付く実績工数の合計 */
  actualHours: number;
};

export interface IEstimationAccuracyQueryRepository {
  /**
   * 中止（CANCELLED）以外のプロジェクトの最新WBSにある、完了かつ論理削除されていないタスク。
   * プロジェクト → 工程の表示順 → タスク番号の順に返す。
   */
  listCompletedTaskEstimates(): Promise<CompletedTaskEstimate[]>;
}
