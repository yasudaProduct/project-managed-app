import { PhaseCoefficientService, PhaseHoursInput } from "@/domains/wbs/phase-coefficient.service";

describe('PhaseCoefficientService', () => {
  describe('calculate', () => {
    it('基準工程に対する各工程の係数を計算できること', () => {
      const phaseHours: PhaseHoursInput[] = [
        { templateId: 1, phaseName: '要件定義', phaseCode: 'RD', totalHours: 120, wbsCount: 5 },
        { templateId: 2, phaseName: '基本設計', phaseCode: 'BD', totalHours: 200, wbsCount: 5 },
        { templateId: 3, phaseName: '詳細設計', phaseCode: 'DD', totalHours: 300, wbsCount: 5 },
        { templateId: 4, phaseName: '実装', phaseCode: 'IM', totalHours: 600, wbsCount: 5 },
        { templateId: 5, phaseName: 'テスト', phaseCode: 'TE', totalHours: 400, wbsCount: 4 },
      ];

      const result = PhaseCoefficientService.calculate(phaseHours, 2); // 基本設計を基準

      expect(result).toHaveLength(5);

      // 要件定義: 120/200 = 0.6
      expect(result[0].templateId).toBe(1);
      expect(result[0].coefficient).toBeCloseTo(0.6);
      expect(result[0].isBase).toBe(false);

      // 基本設計: 200/200 = 1.0 (基準)
      expect(result[1].templateId).toBe(2);
      expect(result[1].coefficient).toBeCloseTo(1.0);
      expect(result[1].isBase).toBe(true);

      // 詳細設計: 300/200 = 1.5
      expect(result[2].coefficient).toBeCloseTo(1.5);

      // 実装: 600/200 = 3.0
      expect(result[3].coefficient).toBeCloseTo(3.0);

      // テスト: 400/200 = 2.0
      expect(result[4].coefficient).toBeCloseTo(2.0);
    });

    it('基準工程の工数が0の場合はcoefficientがnullになること', () => {
      const phaseHours: PhaseHoursInput[] = [
        { templateId: 1, phaseName: '要件定義', phaseCode: 'RD', totalHours: 120, wbsCount: 3 },
        { templateId: 2, phaseName: '基本設計', phaseCode: 'BD', totalHours: 0, wbsCount: 3 },
        { templateId: 3, phaseName: '実装', phaseCode: 'IM', totalHours: 600, wbsCount: 3 },
      ];

      const result = PhaseCoefficientService.calculate(phaseHours, 2);

      expect(result).toHaveLength(3);
      result.forEach(r => {
        expect(r.coefficient).toBeNull();
      });
    });

    it('存在しない基準工程templateIdを指定した場合はcoefficientがnullになること', () => {
      const phaseHours: PhaseHoursInput[] = [
        { templateId: 1, phaseName: '要件定義', phaseCode: 'RD', totalHours: 120, wbsCount: 3 },
        { templateId: 2, phaseName: '基本設計', phaseCode: 'BD', totalHours: 200, wbsCount: 3 },
      ];

      const result = PhaseCoefficientService.calculate(phaseHours, 999);

      expect(result).toHaveLength(2);
      result.forEach(r => {
        expect(r.coefficient).toBeNull();
      });
    });

    it('templateIdがnullの工程も含めて計算できること', () => {
      const phaseHours: PhaseHoursInput[] = [
        { templateId: 1, phaseName: '基本設計', phaseCode: 'BD', totalHours: 200, wbsCount: 3 },
        { templateId: null, phaseName: '未分類', phaseCode: 'OTHER', totalHours: 50, wbsCount: 2 },
      ];

      const result = PhaseCoefficientService.calculate(phaseHours, 1);

      expect(result).toHaveLength(2);
      expect(result[0].coefficient).toBeCloseTo(1.0);
      expect(result[1].coefficient).toBeCloseTo(0.25);
      expect(result[1].templateId).toBeNull();
    });

    it('空の入力に対して空の結果を返すこと', () => {
      const result = PhaseCoefficientService.calculate([], 1);
      expect(result).toHaveLength(0);
    });
  });
});
