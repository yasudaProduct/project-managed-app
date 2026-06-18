/** フェーズ・グループに割り当てる色パレット */
export const PHASE_COLOR_PALETTE = [
  "#3b82f6",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#06b6d4",
  "#ec4899",
  "#84cc16",
  "#f97316",
  "#6366f1",
];

/** インデックスに対応する色を循環で返す */
export function phaseColor(index: number): string {
  return PHASE_COLOR_PALETTE[index % PHASE_COLOR_PALETTE.length];
}
