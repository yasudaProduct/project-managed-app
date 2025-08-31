/**
 * 月別・担当者別集計の計算方式を表す列挙型
 */
export enum AllocationCalculationMode {
  /**
   * 月を跨ぐタスクを考慮した営業日案分ロジック
   * タスクの期間に基づいて営業日数に応じて工数を配分する
   */
  BUSINESS_DAY_ALLOCATION = 'BUSINESS_DAY_ALLOCATION',

  /**
   * 開始日基準ロジック
   * タスクの予定開始日の月に全工数を計上する（月を跨がない従来ロジック）
   */
  START_DATE_BASED = 'START_DATE_BASED',
}

/**
 * 計算方式のメタデータ
 */
export interface AllocationCalculationModeInfo {
  mode: AllocationCalculationMode;
  displayName: string;
  description: string;
}

/**
 * 利用可能な計算方式の一覧
 */
export const ALLOCATION_CALCULATION_MODES: AllocationCalculationModeInfo[] = [
  {
    mode: AllocationCalculationMode.BUSINESS_DAY_ALLOCATION,
    displayName: '営業日案分',
    description: '月を跨ぐタスクの工数を営業日数に応じて月別に配分します',
  },
  {
    mode: AllocationCalculationMode.START_DATE_BASED,
    displayName: '開始日基準',
    description: 'タスクの全工数を予定開始日の月に計上します',
  },
];