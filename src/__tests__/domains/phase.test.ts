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
  
  describe('isEqual', () => {
    it('同じIDのフェーズは等しいと判定されること', () => {
      const phase1 = Phase.createFromDb({
        id: 1,
        name: '設計フェーズ',
        code: new PhaseCode('PH'),
        seq: 1
      });
      
      const phase2 = Phase.createFromDb({
        id: 1,
        name: '異なる名前',
        code: new PhaseCode('XX'),
        seq: 2
      });
      
      expect(phase1.isEqual(phase2)).toBe(true);
    });
    
    it('異なるIDのフェーズは等しくないと判定されること', () => {
      const phase1 = Phase.createFromDb({
        id: 1,
        name: '設計フェーズ',
        code: new PhaseCode('PH'),
        seq: 1
      });
      
      const phase2 = Phase.createFromDb({
        id: 2,
        name: '設計フェーズ',
        code: new PhaseCode('PH'),
        seq: 1
      });
      
      expect(phase1.isEqual(phase2)).toBe(false);
    });
  });
});