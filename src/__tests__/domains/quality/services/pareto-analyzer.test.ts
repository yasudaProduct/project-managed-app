import { ParetoAnalyzer, ParetoInput } from '@/domains/quality/services/pareto-analyzer';

describe('ParetoAnalyzer', () => {
  const analyzer = new ParetoAnalyzer();

  describe('analyze', () => {
    const sampleData: ParetoInput[] = [
      { category: '単純ミス', count: 30 },
      { category: '仕様齟齬', count: 20 },
      { category: '考慮漏れ', count: 15 },
      { category: 'タイポ', count: 10 },
      { category: 'その他', count: 5 },
    ];

    it('件数降順でソートされる', () => {
      const shuffled = [sampleData[2], sampleData[4], sampleData[0], sampleData[3], sampleData[1]];
      const result = analyzer.analyze(shuffled);

      expect(result[0].category).toBe('単純ミス');
      expect(result[1].category).toBe('仕様齟齬');
      expect(result[4].category).toBe('その他');
    });

    it('累積比率が正しく計算される', () => {
      const result = analyzer.analyze(sampleData);

      // 単純ミス: 30/80 = 37.5%
      expect(result[0].cumulativePercent).toBeCloseTo(37.5);
      // 単純ミス + 仕様齟齬: 50/80 = 62.5%
      expect(result[1].cumulativePercent).toBeCloseTo(62.5);
      // 最後は100%
      expect(result[4].cumulativePercent).toBeCloseTo(100);
    });

    it('件数がそのまま保持される', () => {
      const result = analyzer.analyze(sampleData);

      expect(result[0].count).toBe(30);
      expect(result[1].count).toBe(20);
    });

    it('空配列の場合は空配列を返す', () => {
      expect(analyzer.analyze([])).toEqual([]);
    });

    it('1件のみの場合は100%', () => {
      const result = analyzer.analyze([{ category: 'テスト', count: 5 }]);

      expect(result).toHaveLength(1);
      expect(result[0].cumulativePercent).toBeCloseTo(100);
    });

    it('全て同じ件数の場合も正しく累積される', () => {
      const data: ParetoInput[] = [
        { category: 'A', count: 10 },
        { category: 'B', count: 10 },
        { category: 'C', count: 10 },
      ];
      const result = analyzer.analyze(data);

      expect(result[0].cumulativePercent).toBeCloseTo(33.33, 1);
      expect(result[1].cumulativePercent).toBeCloseTo(66.67, 1);
      expect(result[2].cumulativePercent).toBeCloseTo(100);
    });
  });

  describe('groupByField', () => {
    const findings = [
      { causeType: '単純ミス', phenomenonType: 'アベンド', injectionPhase: '基本設計' },
      { causeType: '単純ミス', phenomenonType: '誤出力', injectionPhase: '詳細設計' },
      { causeType: '仕様齟齬', phenomenonType: 'アベンド', injectionPhase: '基本設計' },
      { causeType: undefined, phenomenonType: undefined, injectionPhase: undefined },
    ];

    it('原因別で集約する', () => {
      const result = analyzer.groupByField(findings, 'causeType');

      expect(result).toHaveLength(3); // 単純ミス, 仕様齟齬, 未分類
      expect(result.find((r) => r.category === '単純ミス')!.count).toBe(2);
      expect(result.find((r) => r.category === '仕様齟齬')!.count).toBe(1);
      expect(result.find((r) => r.category === '未分類')!.count).toBe(1);
    });

    it('事象別で集約する', () => {
      const result = analyzer.groupByField(findings, 'phenomenonType');

      expect(result.find((r) => r.category === 'アベンド')!.count).toBe(2);
      expect(result.find((r) => r.category === '誤出力')!.count).toBe(1);
    });

    it('混入工程別で集約する', () => {
      const result = analyzer.groupByField(findings, 'injectionPhase');

      expect(result.find((r) => r.category === '基本設計')!.count).toBe(2);
      expect(result.find((r) => r.category === '詳細設計')!.count).toBe(1);
    });

    it('空配列の場合は空配列を返す', () => {
      expect(analyzer.groupByField([], 'causeType')).toEqual([]);
    });
  });
});
