import { Phase } from "@/domains/phase/phase";
import { PhaseCode } from "@/domains/phase/phase-code";

describe('Phase', () => {
  describe('create', () => {
    it('名前、コード、順序からフェーズを作成できること', () => {
      const phaseCode = new PhaseCode('PH');
      const phase = Phase.create({
        name: '設計フェーズ',
        code: phaseCode,
        seq: 1
      });

      expect(phase).toBeInstanceOf(Phase);
      expect(phase.id).toBeUndefined();
      expect(phase.name).toBe('設計フェーズ');
      expect(phase.code).toBe(phaseCode);
      expect(phase.seq).toBe(1);
    });
  });

  describe('createFromDb', () => {
    it('ID、名前、コード、順序からフェーズを作成できること', () => {
      const phaseCode = new PhaseCode('PH');
      const phase = Phase.createFromDb({
        id: 1,
        name: '設計フェーズ',
        code: phaseCode,
        seq: 1
      });

      expect(phase).toBeInstanceOf(Phase);
      expect(phase.id).toBe(1);
      expect(phase.name).toBe('設計フェーズ');
      expect(phase.code).toBe(phaseCode);
      expect(phase.seq).toBe(1);
    });
  });

  describe('templateId', () => {
    it('templateIdを指定してフェーズを作成できること', () => {
      const phase = Phase.create({
        name: '基本設計',
        code: new PhaseCode('BD'),
        seq: 1,
        templateId: 10
      });

      expect(phase.templateId).toBe(10);
    });

    it('templateIdなしでフェーズを作成できること', () => {
      const phase = Phase.create({
        name: 'カスタムフェーズ',
        code: new PhaseCode('CUSTOM'),
        seq: 1
      });

      expect(phase.templateId).toBeUndefined();
    });

    it('createFromDbでtemplateIdを復元できること', () => {
      const phase = Phase.createFromDb({
        id: 1,
        name: '基本設計',
        code: new PhaseCode('BD'),
        seq: 1,
        templateId: 10
      });

      expect(phase.templateId).toBe(10);
    });
  });

  describe('validate', () => {
    it('期間が不正な場合はエラーが発生する', () => {
      expect(() => {
        Phase.create({
          name: '設計フェーズ',
          code: new PhaseCode('PH'),
          seq: 1,
          period: { start: new Date('2025-01-01'), end: new Date('2024-01-01') }
        });
      }).toThrow('無効な期間: 開始日は終了日より前である必要があります。');
    });
  });
});