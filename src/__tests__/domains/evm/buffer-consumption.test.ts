import { evaluateBufferConsumption } from '@/domains/evm/buffer-consumption';

/**
 * バッファ消化の評価（CCPMのフィーバーチャートの考え方）。
 * - 消化量 = これまでの超過（AC - EV。超過していなければ0）
 * - 消化率 = 消化量 / バッファ、出来高率 = EV / タスクのBAC（バッファを除く）
 * - 消化率 ≦ 出来高率 → 健全、出来高率 + 20pt まで → 注意、それ以上またはバッファを使い切った → 危険
 */
describe('evaluateBufferConsumption', () => {
  it('超過分をバッファの消化として、消化率・出来高率・残りを返す', () => {
    expect(
      evaluateBufferConsumption({ bufferAmount: 20, ev: 50, ac: 55, taskBac: 100 })
    ).toEqual({
      bufferAmount: 20,
      consumedAmount: 5,
      remainingAmount: 15,
      consumptionPct: 25,
      progressPct: 50,
      zone: 'healthy',
    });
  });

  it('超過していなければ消化は0', () => {
    expect(
      evaluateBufferConsumption({ bufferAmount: 20, ev: 50, ac: 40, taskBac: 100 })?.consumedAmount
    ).toBe(0);
  });

  it('消化率が出来高率を20pt以内で上回れば注意、それを超えれば危険', () => {
    expect(
      evaluateBufferConsumption({ bufferAmount: 20, ev: 30, ac: 40, taskBac: 100 })?.zone
    ).toBe('warning'); // 消化率50% / 出来高率30%（+20pt）
    expect(
      evaluateBufferConsumption({ bufferAmount: 20, ev: 30, ac: 41, taskBac: 100 })?.zone
    ).toBe('critical'); // 消化率55% / 出来高率30%（+25pt）
  });

  it('バッファを使い切ったら出来高率に関わらず危険（残りは0未満にしない）', () => {
    const result = evaluateBufferConsumption({ bufferAmount: 20, ev: 95, ac: 120, taskBac: 100 });
    expect(result?.zone).toBe('critical');
    expect(result?.consumptionPct).toBe(125);
    expect(result?.remainingAmount).toBe(0);
  });

  it('バッファがなければ評価しない（null）', () => {
    expect(evaluateBufferConsumption({ bufferAmount: 0, ev: 50, ac: 60, taskBac: 100 })).toBeNull();
  });
});
