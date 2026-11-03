/**
 * 集計表の工数列（基準・予定・実績・見通）の表示制御。
 *
 * 実績列は常に表示されるため、基準・予定・見通の3列を同時に表示すると
 * 4列すべてが表示されることになる。これを避けるため、
 * 基準・予定・見通のうち同時に表示できるのは最大2列までとする。
 */

/** 表示切替が可能な工数列 */
export type ToggleableSummaryColumn = 'baseline' | 'planned' | 'forecast';

/** 表示切替が可能な工数列の表示状態 */
export interface SummaryColumnSettings {
  showBaseline: boolean;
  showPlanned: boolean;
  showForecast: boolean;
}

const SETTING_KEYS: Record<ToggleableSummaryColumn, keyof SummaryColumnSettings> = {
  baseline: 'showBaseline',
  planned: 'showPlanned',
  forecast: 'showForecast',
};

/** 同時に表示できる列数（実績列は常に表示されるため、残りは2列まで） */
const MAX_VISIBLE_TOGGLEABLE_COLUMNS = 2;

/**
 * 指定した列を表示に切り替えられるか
 * @param settings 現在の表示状態
 * @param column 対象の列
 */
export function canEnableSummaryColumn(
  settings: SummaryColumnSettings,
  column: ToggleableSummaryColumn
): boolean {
  const otherVisibleCount = (
    Object.keys(SETTING_KEYS) as ToggleableSummaryColumn[]
  ).filter((c) => c !== column && settings[SETTING_KEYS[c]]).length;

  return otherVisibleCount < MAX_VISIBLE_TOGGLEABLE_COLUMNS;
}

/**
 * 指定した列の表示状態を切り替える。
 * 4列すべてが表示される切り替えは無視し、現在の状態をそのまま返す。
 * @param settings 現在の表示状態
 * @param column 対象の列
 * @param next 切り替え後の表示状態
 */
export function toggleSummaryColumn(
  settings: SummaryColumnSettings,
  column: ToggleableSummaryColumn,
  next: boolean
): SummaryColumnSettings {
  if (next && !canEnableSummaryColumn(settings, column)) {
    return settings;
  }
  return { ...settings, [SETTING_KEYS[column]]: next };
}

/**
 * 表示切替を操作できないか（非表示かつ表示にできない列）
 * @param settings 現在の表示状態
 * @param column 対象の列
 */
export function isSummaryColumnToggleDisabled(
  settings: SummaryColumnSettings,
  column: ToggleableSummaryColumn
): boolean {
  if (settings[SETTING_KEYS[column]]) return false;
  return !canEnableSummaryColumn(settings, column);
}
