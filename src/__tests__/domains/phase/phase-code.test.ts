import { PhaseCode } from "@/domains/phase/phase-code";

describe('PhaseCode', () => {
  describe('constructor', () => {
    it('コード値で初期化できること', () => {
      const phaseCode = new PhaseCode('PH');
      expect(phaseCode).toBeInstanceOf(PhaseCode);
    });

    it('コードが英数字でない場合はエラーが発生する', () => {
      expect(() => {
        new PhaseCode('PH-1');
      }).toThrow('コードは英数字である必要があります。');
    });
  });

  describe('value', () => {
    it('コード値を取得できること', () => {
      const phaseCode = new PhaseCode('PH');
      expect(phaseCode.value()).toBe('PH');
    });
  });
});