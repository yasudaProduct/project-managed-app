/**
 * WBSヘッダー表示用のタスクサマリー集計結果
 */
export interface WbsTaskSummaryResult {
  /** 予定工数の合計 */
  taskKosu: number;
  /** 実績工数の合計 */
  taskJisseki: number;
  /** 基準工数の合計 */
  kijunKosu: number;
  /** タスクに紐付いていない作業実績の件数 */
  unlinkedWorkRecordsCount: number;
  /** 実績ベースの完了タスク数 */
  actualCompleted: number;
  /** 予定ベースの完了タスク数 */
  plannedCompleted: number;
  /** 実績ベースの進行中タスク数 */
  actualInProgress: number;
  /** 予定ベースの進行中タスク数 */
  plannedInProgress: number;
  /** 予定完了タスクの工数合計 */
  plannedCompletedKosu: number;
  /** 実績ベースの進捗率(%) */
  actualProgress: number;
  /** 予定ベースの進捗率(%) */
  plannedProgress: number;
}
