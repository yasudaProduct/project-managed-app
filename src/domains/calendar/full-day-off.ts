/**
 * 全日休暇として扱う予定タイトル（完全一致）
 * @description 全休エントリは開始・終了時刻が意味を持たないため、
 * タイトルが一致した場合は時刻に関係なく終日不在として扱う。
 */
export const FULL_DAY_OFF_TITLES = ['休暇', '有給', '休み', '全休', '代休', '振休', '有給休暇'] as const; // TODO:設定から動的にする

export function isFullDayOffTitle(title: string): boolean {
  return (FULL_DAY_OFF_TITLES as readonly string[]).includes(title);
}
