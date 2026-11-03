import { summarizeEstimationAccuracy } from '@/domains/estimation/estimation-accuracy';

/**
 * 見積精度の集計（Q7: 次のプロジェクトに何を活かすか）。
 * 完了タスクについて、グループごとに「実績 / 基準」比と超過タスクの割合を求める。
 */
describe('summarizeEstimationAccuracy', () => {
  const item = (groupKey: string, label: string, projectId: string, baselineHours: number, actualHours: number) => ({
    groupKey,
    label,
    projectId,
    baselineHours,
    actualHours,
  });

  it('グループごとに基準・実績の合計、実績/基準比、超過タスク率、プロジェクト数を求める', () => {
    const rows = summarizeEstimationAccuracy([
      item('t:1', '基本設計', 'p1', 10, 12),
      item('t:1', '基本設計', 'p1', 10, 8),
      item('t:1', '基本設計', 'p2', 20, 30),
      item('t:2', '結合テスト', 'p1', 40, 40),
    ]);

    expect(rows).toEqual([
      {
        key: 't:1',
        label: '基本設計',
        projectCount: 2,
        taskCount: 3,
        baselineHours: 40,
        actualHours: 50,
        actualToBaselineRatio: 1.25,
        overrunTaskRatePct: (2 / 3) * 100,
      },
      {
        key: 't:2',
        label: '結合テスト',
        projectCount: 1,
        taskCount: 1,
        baselineHours: 40,
        actualHours: 40,
        actualToBaselineRatio: 1,
        overrunTaskRatePct: 0,
      },
    ]);
  });

  it('基準工数の合計が0のグループは比をnullにする', () => {
    const [row] = summarizeEstimationAccuracy([item('t:1', '基本設計', 'p1', 0, 5)]);

    expect(row.actualToBaselineRatio).toBeNull();
  });

  it('入力の順にグループを並べる（最初に現れた順）', () => {
    const rows = summarizeEstimationAccuracy([
      item('b', 'B', 'p1', 1, 1),
      item('a', 'A', 'p1', 1, 1),
      item('b', 'B', 'p1', 1, 1),
    ]);

    expect(rows.map((row) => row.key)).toEqual(['b', 'a']);
  });
});
