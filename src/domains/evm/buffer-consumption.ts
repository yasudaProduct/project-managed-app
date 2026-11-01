/**
 * バッファ消化の評価（ドメインサービス）。CCPM のフィーバーチャートの考え方で、
 * 「バッファの減り方が作業の進み方より速くないか」を判定する。
 * - 消化量 = これまでの超過（AC - EV。超過していなければ0）
 * - 消化率 = 消化量 / バッファ、出来高率 = EV / タスクのBAC（バッファを除く）
 * - 判定: 消化率 ≦ 出来高率 → 健全、出来高率 + 20pt まで → 注意、それ以上またはバッファを使い切った → 危険
 */

/** 消化率が出来高率をこのポイント数まで上回っても「注意」に留める */
export const BUFFER_WARNING_MARGIN_PT = 20;

export type BufferZone = 'healthy' | 'warning' | 'critical';

export type BufferConsumptionInput = {
  /** バッファの量（計算モードの単位。工数 or 金額） */
  bufferAmount: number;
  ev: number;
  ac: number;
  /** タスクのBAC（バッファを除く） */
  taskBac: number;
};

export type BufferConsumption = {
  bufferAmount: number;
  consumedAmount: number;
  remainingAmount: number;
  consumptionPct: number;
  progressPct: number;
  zone: BufferZone;
};

export function evaluateBufferConsumption(
  input: BufferConsumptionInput
): BufferConsumption | null {
  if (input.bufferAmount <= 0) return null;

  const consumedAmount = Math.max(0, input.ac - input.ev);
  const consumptionPct = (consumedAmount / input.bufferAmount) * 100;
  const progressPct = input.taskBac > 0 ? (input.ev / input.taskBac) * 100 : 0;

  let zone: BufferZone;
  if (consumptionPct >= 100) zone = 'critical';
  else if (consumptionPct <= progressPct) zone = 'healthy';
  else if (consumptionPct <= progressPct + BUFFER_WARNING_MARGIN_PT) zone = 'warning';
  else zone = 'critical';

  return {
    bufferAmount: input.bufferAmount,
    consumedAmount,
    remainingAmount: Math.max(0, input.bufferAmount - consumedAmount),
    consumptionPct,
    progressPct,
    zone,
  };
}
