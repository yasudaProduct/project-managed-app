import { QualityTarget } from '@/domains/quality/entities/quality-target';

describe('QualityTarget', () => {
  describe('create', () => {
    it('必須パラメータで作成できる', () => {
      const target = QualityTarget.create({
        wbsId: 1,
        taskNo: 'T-001',
        name: '基本設計書',
      });

      expect(target.wbsId).toBe(1);
      expect(target.taskNo).toBe('T-001');
      expect(target.name).toBe('基本設計書');
      expect(target.isActive).toBe(true);
      expect(target.id).toBeUndefined();
    });

    it('オプションパラメータを設定できる', () => {
      const target = QualityTarget.create({
        wbsId: 1,
        taskNo: 'T-001',
        name: '基本設計書',
        subsystem: 'ユーザー管理',
        featureGroup: '認証',
        phaseCode: 'DD',
        assigneeId: 'user-1',
      });

      expect(target.subsystem).toBe('ユーザー管理');
      expect(target.featureGroup).toBe('認証');
      expect(target.phaseCode).toBe('DD');
      expect(target.assigneeId).toBe('user-1');
    });

    it('wbsIdは必須', () => {
      expect(() =>
        QualityTarget.create({ wbsId: 0, taskNo: 'T-001', name: 'test' })
      ).toThrow('wbsIdは必須です');
    });

    it('taskNoは必須', () => {
      expect(() =>
        QualityTarget.create({ wbsId: 1, taskNo: '', name: 'test' })
      ).toThrow('taskNoは必須です');
    });

    it('nameは必須', () => {
      expect(() =>
        QualityTarget.create({ wbsId: 1, taskNo: 'T-001', name: '' })
      ).toThrow('nameは必須です');
    });
  });

  describe('reconstruct', () => {
    it('全フィールドで復元できる', () => {
      const target = QualityTarget.reconstruct({
        id: 10,
        wbsId: 1,
        taskNo: 'T-001',
        name: '基本設計書',
        subsystem: 'ユーザー管理',
        featureGroup: '認証',
        phaseCode: 'DD',
        assigneeId: 'user-1',
        isActive: true,
      });

      expect(target.id).toBe(10);
      expect(target.subsystem).toBe('ユーザー管理');
    });
  });

  describe('deactivate', () => {
    it('非アクティブ化できる', () => {
      const target = QualityTarget.create({
        wbsId: 1,
        taskNo: 'T-001',
        name: '基本設計書',
      });
      target.deactivate();
      expect(target.isActive).toBe(false);
    });
  });
});
