import { detectManhourOverrun } from '@/domains/task/task-manhour-overrun';

/**
 * タスクの工数超過の判定。
 * しきい値はプロジェクト設定 costOverrunThresholdPct（予定工数に対する実績工数の%）。
 * しきい値の8割に達したら警告、しきい値以上で超過とする。
 */
describe('detectManhourOverrun', () => {
  it('実績がしきい値以上なら超過（割合つき）', () => {
    expect(
      detectManhourOverrun({ status: 'IN_PROGRESS', plannedHours: 10, actualHours: 12 }, 100)
    ).toEqual({ level: 'EXCEEDED', percentage: 120 });
  });

  it('しきい値の8割以上なら警告', () => {
    expect(
      detectManhourOverrun({ status: 'IN_PROGRESS', plannedHours: 10, actualHours: 8 }, 100)
    ).toEqual({ level: 'WARNING', percentage: 80 });
  });

  it('しきい値の8割未満なら対象外', () => {
    expect(
      detectManhourOverrun({ status: 'IN_PROGRESS', plannedHours: 10, actualHours: 7.9 }, 100)
    ).toBeNull();
  });

  it('しきい値を120%にすると、超過は120%以上・警告は96%以上', () => {
    expect(
      detectManhourOverrun({ status: 'IN_PROGRESS', plannedHours: 10, actualHours: 11 }, 120)
    ).toEqual({ level: 'WARNING', percentage: 110 });
    expect(
      detectManhourOverrun({ status: 'IN_PROGRESS', plannedHours: 10, actualHours: 12 }, 120)
    ).toEqual({ level: 'EXCEEDED', percentage: 120 });
  });

  it('割合は整数に丸める', () => {
    expect(
      detectManhourOverrun({ status: 'IN_PROGRESS', plannedHours: 3, actualHours: 4 }, 100)
    ).toEqual({ level: 'EXCEEDED', percentage: 133 });
  });

  it('完了タスク・予定工数0・しきい値0以下は対象外', () => {
    expect(
      detectManhourOverrun({ status: 'COMPLETED', plannedHours: 10, actualHours: 20 }, 100)
    ).toBeNull();
    expect(
      detectManhourOverrun({ status: 'IN_PROGRESS', plannedHours: 0, actualHours: 5 }, 100)
    ).toBeNull();
    expect(
      detectManhourOverrun({ status: 'IN_PROGRESS', plannedHours: 10, actualHours: 20 }, 0)
    ).toBeNull();
  });
});
