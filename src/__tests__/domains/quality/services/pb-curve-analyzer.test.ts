import { PbCurveAnalyzer, PbCurveInput } from '@/domains/quality/services/pb-curve-analyzer';

describe('PbCurveAnalyzer', () => {
  const analyzer = new PbCurveAnalyzer();

  const sampleData: PbCurveInput[] = [
    { date: new Date('2026-04-01'), plannedTotal: 100, executedTotal: 10, passedTotal: 9, failedTotal: 1, blockedTotal: 0 },
    { date: new Date('2026-04-02'), plannedTotal: 100, executedTotal: 25, passedTotal: 23, failedTotal: 2, blockedTotal: 0 },
    { date: new Date('2026-04-03'), plannedTotal: 100, executedTotal: 50, passedTotal: 46, failedTotal: 4, blockedTotal: 0 },
    { date: new Date('2026-04-04'), plannedTotal: 100, executedTotal: 75, passedTotal: 70, failedTotal: 5, blockedTotal: 0 },
    { date: new Date('2026-04-05'), plannedTotal: 100, executedTotal: 100, passedTotal: 93, failedTotal: 7, blockedTotal: 0 },
  ];

  describe('analyze', () => {
    it('日付ごとのPB曲線データを生成する', () => {
      const result = analyzer.analyze(sampleData);

      expect(result).toHaveLength(5);
    });

    it('テスト消化残（remaining）を正しく計算する', () => {
      const result = analyzer.analyze(sampleData);

      // remaining = plannedTotal - executedTotal
      expect(result[0].remaining).toBe(90); // 100 - 10
      expect(result[2].remaining).toBe(50); // 100 - 50
      expect(result[4].remaining).toBe(0);  // 100 - 100
    });

    it('バグ検出累計（bugCumulative）を正しく返す', () => {
      const result = analyzer.analyze(sampleData);

      expect(result[0].bugCumulative).toBe(1);
      expect(result[2].bugCumulative).toBe(4);
      expect(result[4].bugCumulative).toBe(7);
    });

    it('日付でソートされる', () => {
      const shuffled = [sampleData[3], sampleData[0], sampleData[4], sampleData[1], sampleData[2]];
      const result = analyzer.analyze(shuffled);

      expect(result[0].date).toEqual(new Date('2026-04-01'));
      expect(result[4].date).toEqual(new Date('2026-04-05'));
    });

    it('空配列の場合は空配列を返す', () => {
      expect(analyzer.analyze([])).toEqual([]);
    });
  });

  describe('analyzeWithPlan（目標線付き）', () => {
    it('目標線（計画ベースの消化予定）を含むデータを返す', () => {
      const plan = [
        { date: new Date('2026-04-01'), plannedExecuted: 20 },
        { date: new Date('2026-04-02'), plannedExecuted: 40 },
        { date: new Date('2026-04-03'), plannedExecuted: 60 },
        { date: new Date('2026-04-04'), plannedExecuted: 80 },
        { date: new Date('2026-04-05'), plannedExecuted: 100 },
      ];

      const result = analyzer.analyzeWithPlan(sampleData, plan);

      expect(result).toHaveLength(5);
      // 目標消化残 = plannedTotal - plannedExecuted
      expect(result[0].plannedRemaining).toBe(80); // 100 - 20
      expect(result[4].plannedRemaining).toBe(0);  // 100 - 100
    });

    it('目標線が無い日はplannedRemainingがundefined', () => {
      const plan = [
        { date: new Date('2026-04-01'), plannedExecuted: 20 },
        { date: new Date('2026-04-03'), plannedExecuted: 60 },
      ];

      const result = analyzer.analyzeWithPlan(sampleData, plan);

      expect(result[0].plannedRemaining).toBe(80);
      expect(result[1].plannedRemaining).toBeUndefined();
      expect(result[2].plannedRemaining).toBe(40);
    });
  });
});
