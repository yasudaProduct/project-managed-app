import { PhaseCode } from "@/domains/phase/phase-code";

describe('PhaseCode', () => {
  describe('constructor', () => {
    it('コード値で初期化できること', () => {
      const phaseCode = new PhaseCode('PH');
      expect(phaseCode).toBeInstanceOf(PhaseCode);
    });
  });
  
  describe('value', () => {
    it('コード値を取得できること', () => {
      const phaseCode = new PhaseCode('PH');
      expect(phaseCode.value()).toBe('PH');
    });
    
    it('空文字列のコードも許容すること', () => {
      const phaseCode = new PhaseCode('');
      expect(phaseCode.value()).toBe('');
    });
  });
});