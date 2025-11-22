import { ProjectStatus } from "@/domains/project/project-status";

describe('ProjectStatus', () => {

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