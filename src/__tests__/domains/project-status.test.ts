import { ProjectStatus } from "@/domains/project/project-status";

describe('ProjectStatus', () => {
  describe('constructor', () => {
    it('ステータス値で初期化できること', () => {
      const status = new ProjectStatus({ status: 'ACTIVE' });
      expect(status.status).toBe('ACTIVE');
    });
  });
  
  describe('Name', () => {
    it('INACTIVEのステータスが「未開始」と表示されること', () => {
      const status = new ProjectStatus({ status: 'INACTIVE' });
      expect(status.Name()).toBe('未開始');
    });
    
    it('ACTIVEのステータスが「進行中」と表示されること', () => {
      const status = new ProjectStatus({ status: 'ACTIVE' });
      expect(status.Name()).toBe('進行中');
    });
    
    it('DONEのステータスが「完了」と表示されること', () => {
      const status = new ProjectStatus({ status: 'DONE' });
      expect(status.Name()).toBe('完了');
    });
    
    it('CANCELLEDのステータスが「キャンセル」と表示されること', () => {
      const status = new ProjectStatus({ status: 'CANCELLED' });
      expect(status.Name()).toBe('キャンセル');
    });
    
    it('PENDINGのステータスが「保留」と表示されること', () => {
      const status = new ProjectStatus({ status: 'PENDING' });
      expect(status.Name()).toBe('保留');
    });
    
    it('未定義のステータスが「不明」と表示されること', () => {
        // @ts-expect-error - テスト目的で無効な値を渡す
      const status = new ProjectStatus({ status: 'UNKNOWN_STATUS' });
      expect(status.Name()).toBe('不明');
    });
  });
  
  describe('isEqual', () => {
    it('同じステータス値が等しいと判定されること', () => {
      const status = new ProjectStatus({ status: 'ACTIVE' });
      expect(status.isEqual('ACTIVE')).toBe(true);
    });
    
    it('異なるステータス値が等しくないと判定されること', () => {
      const status = new ProjectStatus({ status: 'ACTIVE' });
      expect(status.isEqual('DONE')).toBe(false);
    });
    
    it('大文字小文字が違うステータス値が等しくないと判定されること', () => {
      const status = new ProjectStatus({ status: 'ACTIVE' });
        // @ts-expect-error - テスト目的で無効な値を渡す
      expect(status.isEqual('active')).toBe(false);
    });
  });
});