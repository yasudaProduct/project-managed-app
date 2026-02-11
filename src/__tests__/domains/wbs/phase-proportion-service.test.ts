import { PhaseProportionService, PhaseHoursInput } from "@/domains/wbs/phase-proportion.service";

describe('PhaseProportionService', () => {
  describe('calculate', () => {
    const phaseHours: PhaseHoursInput[] = [
      { templateId: 1, phaseName: 'PM', phaseCode: 'PM', totalHours: 150 },
      { templateId: 2, phaseName: '要件定義', phaseCode: 'RD', totalHours: 120 },
      { templateId: 3, phaseName: '基本設計', phaseCode: 'BD', totalHours: 200 },
      { templateId: 4, phaseName: '詳細設計', phaseCode: 'DD', totalHours: 300 },
      { templateId: 5, phaseName: '実装', phaseCode: 'IM', totalHours: 600 },
      { templateId: 6, phaseName: 'テスト', phaseCode: 'TE', totalHours: 280 },
      { templateId: 7, phaseName: 'レビュー', phaseCode: 'RV', totalHours: 50 },
    ];
    // 合計: 1700h

    it('全体に対する各工程の割合を計算できること', () => {
      const result = PhaseProportionService.calculate(phaseHours);

      expect(result).toHaveLength(7);

      // PM: 150/1700
      expect(result[0].phaseName).toBe('PM');
      expect(result[0].proportion).toBeCloseTo(150 / 1700);
      expect(result[0].totalHours).toBe(150);

      // 実装: 600/1700
      expect(result[4].phaseName).toBe('実装');
      expect(result[4].proportion).toBeCloseTo(600 / 1700);

      // 全工程の割合の合計が1.0になること
      const totalProportion = result.reduce((sum, r) => sum + r.proportion, 0);
      expect(totalProportion).toBeCloseTo(1.0);
    });

    it('カスタム母数で割合を計算できること', () => {
      // 開発工程(基本設計+詳細設計+実装+テスト)を母数とする
      const customBaseTemplateIds = [3, 4, 5, 6];
      // 母数: 200+300+600+280 = 1380

      const result = PhaseProportionService.calculate(phaseHours, customBaseTemplateIds);

      expect(result).toHaveLength(7);

      // PM: 全体割合=150/1700, カスタム割合=150/1380
      const pm = result.find(r => r.phaseName === 'PM')!;
      expect(pm.proportion).toBeCloseTo(150 / 1700);
      expect(pm.customProportion).toBeCloseTo(150 / 1380);

      // 基本設計: 全体割合=200/1700, カスタム割合=200/1380
      const bd = result.find(r => r.phaseName === '基本設計')!;
      expect(bd.proportion).toBeCloseTo(200 / 1700);
      expect(bd.customProportion).toBeCloseTo(200 / 1380);

      // レビュー: 全体割合=50/1700, カスタム割合=50/1380
      const rv = result.find(r => r.phaseName === 'レビュー')!;
      expect(rv.customProportion).toBeCloseTo(50 / 1380);
    });

    it('全工数が0の場合はproportionが0になること', () => {
      const zeroHours: PhaseHoursInput[] = [
        { templateId: 1, phaseName: 'PM', phaseCode: 'PM', totalHours: 0 },
        { templateId: 2, phaseName: '実装', phaseCode: 'IM', totalHours: 0 },
      ];

      const result = PhaseProportionService.calculate(zeroHours);

      expect(result).toHaveLength(2);
      result.forEach(r => {
        expect(r.proportion).toBe(0);
      });
    });

    it('カスタム母数の合計が0の場合はcustomProportionがnullになること', () => {
      const hours: PhaseHoursInput[] = [
        { templateId: 1, phaseName: 'PM', phaseCode: 'PM', totalHours: 100 },
        { templateId: 2, phaseName: '実装', phaseCode: 'IM', totalHours: 0 },
      ];

      // templateId=2(実装)を母数に指定するが、工数が0
      const result = PhaseProportionService.calculate(hours, [2]);

      const pm = result.find(r => r.phaseName === 'PM')!;
      expect(pm.proportion).toBeCloseTo(1.0);
      expect(pm.customProportion).toBeNull();
    });

    it('空の入力に対して空の結果を返すこと', () => {
      const result = PhaseProportionService.calculate([]);
      expect(result).toHaveLength(0);
    });

    it('templateIdがnullの工程も含めて計算できること', () => {
      const hours: PhaseHoursInput[] = [
        { templateId: 1, phaseName: '基本設計', phaseCode: 'BD', totalHours: 200 },
        { templateId: null, phaseName: '未分類', phaseCode: 'OTHER', totalHours: 50 },
      ];

      const result = PhaseProportionService.calculate(hours);

      expect(result).toHaveLength(2);
      expect(result[0].proportion).toBeCloseTo(200 / 250);
      expect(result[1].proportion).toBeCloseTo(50 / 250);
    });
  });
});
