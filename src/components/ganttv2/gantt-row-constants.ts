/**
 * ガントチャートの行の高さに関する定数
 * タスクリストとチャート部分で一貫性を保つため
 */

import React from "react";

export const GANTT_ROW_HEIGHTS = {
  // グループヘッダーの高さ
  GROUP_HEADER: 32, // 2rem = 32px
  
  // タスク行の高さ
  TASK_COLLAPSED: 48, // 3rem = 48px
  TASK_EXPANDED: 80,  // 5rem = 80px (タスク名+ステータス: 24px, 担当者: 16px, 日程工数: 16px, パディング: 24px)
  
  // タスクバーの高さ
  TASK_BAR: 32, // 2rem = 32px
  
  // パディング
  TASK_PADDING_Y: 8, // py-2 = 8px (top + bottom)
} as const;

/**
 * 表示される情報量に応じたタスクの高さを動的に計算
 */
export function calculateTaskRowHeight(task: {
  assignee?: { displayName: string } | null;
  yoteiStart?: Date | string | null;
  yoteiEnd?: Date | string | null;
  yoteiKosu?: number | null;
}, isCollapsed: boolean): number {
  if (isCollapsed) {
    return GANTT_ROW_HEIGHTS.TASK_COLLAPSED;
  }

  // 基本の高さ（タスク名とステータス）
  let height = 32; // タスク名とステータスバッジの行
  
  // 詳細情報の高さを加算
  height += 8; // mt-2のマージン
  
  // 担当者情報があれば追加
  if (task.assignee) {
    height += 16; // 担当者行の高さ
    height += 4; // space-y-1のマージン
  }
  
  // 日程・工数情報があれば追加
  if (task.yoteiStart || task.yoteiEnd || (task.yoteiKosu && task.yoteiKosu > 0)) {
    height += 16; // 日程・工数行の高さ
  }
  
  // 上下パディング（CSSで py-2 = 16px が適用される）
  height += 16;
  
  // 最小高さ
  return Math.max(height, GANTT_ROW_HEIGHTS.TASK_EXPANDED);
}

/**
 * タスクの折りたたみ状態に応じた高さを取得（後方互換性のため）
 */
export function getTaskRowHeight(isCollapsed: boolean): number {
  return isCollapsed ? GANTT_ROW_HEIGHTS.TASK_COLLAPSED : GANTT_ROW_HEIGHTS.TASK_EXPANDED;
}

/**
 * タスクの折りたたみ状態に応じたスタイルを取得
 */
export function getTaskRowStyle(isCollapsed: boolean): React.CSSProperties {
  const height = getTaskRowHeight(isCollapsed);
  return {
    height: `${height}px`,
    minHeight: `${height}px`,
  };
}

/**
 * タスク情報に応じた動的なスタイルを取得
 */
export function getTaskRowStyleDynamic(task: {
  assignee?: { displayName: string } | null;
  yoteiStart?: Date | string | null;
  yoteiEnd?: Date | string | null;
  yoteiKosu?: number | null;
}, isCollapsed: boolean): React.CSSProperties {
  const height = calculateTaskRowHeight(task, isCollapsed);
  return {
    height: `${height}px`,
    minHeight: `${height}px`,
  };
}

/**
 * グループヘッダーのスタイルを取得
 */
export function getGroupHeaderStyle(): React.CSSProperties {
  return {
    height: `${GANTT_ROW_HEIGHTS.GROUP_HEADER}px`,
    minHeight: `${GANTT_ROW_HEIGHTS.GROUP_HEADER}px`,
  };
}

/**
 * タスクバーの垂直位置を取得
 * タスクの折りたたみ状態とパディングを考慮して中央に配置
 */
export function getTaskBarTop(isCollapsed: boolean): string {
  // タスクバーをタスク行の中央に配置
  const rowHeight = getTaskRowHeight(isCollapsed);
  const topOffset = (rowHeight - GANTT_ROW_HEIGHTS.TASK_BAR) / 2;
  return `${topOffset}px`;
}

/**
 * 動的高さに対応したタスクバーの垂直位置を取得
 */
export function getTaskBarTopDynamic(task: {
  assignee?: { displayName: string } | null;
  yoteiStart?: Date | string | null;
  yoteiEnd?: Date | string | null;
  yoteiKosu?: number | null;
}, isCollapsed: boolean): string {
  if (isCollapsed) {
    // 折りたたみ時は標準位置
    return getTaskBarTop(isCollapsed);
  }
  
  // 展開時はタスク名行の中央に配置
  const topOffset = (32 - GANTT_ROW_HEIGHTS.TASK_BAR) / 2; // タスク名行の中央
  return `${topOffset}px`;
}

/**
 * タスクバーのスタイルを取得
 */
export function getTaskBarStyle(isCollapsed: boolean): React.CSSProperties {
  return {
    height: `${GANTT_ROW_HEIGHTS.TASK_BAR}px`,
    top: getTaskBarTop(isCollapsed),
  };
}

/**
 * 動的高さに対応したタスクバーのスタイルを取得
 */
export function getTaskBarStyleDynamic(task: {
  assignee?: { displayName: string } | null;
  yoteiStart?: Date | string | null;
  yoteiEnd?: Date | string | null;
  yoteiKosu?: number | null;
}, isCollapsed: boolean): React.CSSProperties {
  return {
    height: `${GANTT_ROW_HEIGHTS.TASK_BAR}px`,
    top: getTaskBarTopDynamic(task, isCollapsed),
  };
}