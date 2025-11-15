import { WbsAssignee } from '@/domains/wbs/wbs-assignee';

describe('WbsAssignee', () => {
  describe('create', () => {
    it('WbsAssignee インスタンスを作成できる', () => {
      const assignee = WbsAssignee.create({
        wbsId: 1,
        userId: 'user-1',
        rate: 0.8,
        costPerHour: 5000,
        seq: 1
      });

      expect(assignee.wbsId).toBe(1);
      expect(assignee.userId).toBe('user-1');
      expect(assignee.getRate()).toBe(0.8);
      expect(assignee.getCostPerHour()).toBe(5000);
      expect(assignee.seq).toBe(1);
      expect(assignee.id).toBeUndefined();
    });

    it('costPerHourを指定してWbsAssigneeを作成できる', () => {
      const assignee = WbsAssignee.create({
        wbsId: 1,
        userId: 'user-1',
        rate: 0.8,
        costPerHour: 8000,
        seq: 1
      });

      expect(assignee.getCostPerHour()).toBe(8000);
    });
  });

  describe('createFromDb', () => {
    it('DBから取得したデータでWbsAssigneeを作成できる', () => {
      const assignee = WbsAssignee.createFromDb({
        id: 100,
        wbsId: 1,
        userId: 'user-1',
        userName: '田中太郎',
        rate: 0.8,
        costPerHour: 6000,
        seq: 1
      });

      expect(assignee.id).toBe(100);
      expect(assignee.wbsId).toBe(1);
      expect(assignee.userId).toBe('user-1');
      expect(assignee.userName).toBe('田中太郎');
      expect(assignee.getRate()).toBe(0.8);
      expect(assignee.getCostPerHour()).toBe(6000);
      expect(assignee.seq).toBe(1);
    });
  });

  describe('createUnassigned', () => {
    it('未割当担当者を作成できる', () => {
      const unassigned = WbsAssignee.createUnassigned(1);

      expect(unassigned.wbsId).toBe(1);
      expect(unassigned.userId).toBe('unassigned');
      expect(unassigned.getRate()).toBe(1);
      expect(unassigned.seq).toBe(0);
      expect(unassigned.id).toBeUndefined();
    });

    it('未割当担当者は稼働率1で作成される（ビジネスルール）', () => {
      const unassigned = WbsAssignee.createUnassigned(1);
      expect(unassigned.getRate()).toBe(1);
    });

    it('未割当担当者はuserIdが"unassigned"となる', () => {
      const unassigned = WbsAssignee.createUnassigned(1);
      expect(unassigned.userId).toBe('unassigned');
    });

    it('異なるwbsIdで未割当担当者を作成できる', () => {
      const unassigned1 = WbsAssignee.createUnassigned(1);
      const unassigned2 = WbsAssignee.createUnassigned(2);

      expect(unassigned1.wbsId).toBe(1);
      expect(unassigned2.wbsId).toBe(2);
    });
  });

  describe('isEqual', () => {
    it('IDが同じ場合はtrueを返す', () => {
      const assignee1 = WbsAssignee.createFromDb({
        id: 100,
        wbsId: 1,
        userId: 'user-1',
        rate: 0.8,
        costPerHour: 5000,
        seq: 1
      });

      const assignee2 = WbsAssignee.createFromDb({
        id: 100,
        wbsId: 1,
        userId: 'user-1',
        rate: 0.8,
        costPerHour: 5000,
        seq: 1
      });

      expect(assignee1.isEqual(assignee2)).toBe(true);
    });

    it('IDが異なる場合はfalseを返す', () => {
      const assignee1 = WbsAssignee.createFromDb({
        id: 100,
        wbsId: 1,
        userId: 'user-1',
        rate: 0.8,
        costPerHour: 5000,
        seq: 1
      });

      const assignee2 = WbsAssignee.createFromDb({
        id: 200,
        wbsId: 1,
        userId: 'user-1',
        rate: 0.8,
        costPerHour: 5000,
        seq: 1
      });

      expect(assignee1.isEqual(assignee2)).toBe(false);
    });
  });

  describe('updateRate', () => {
    it('稼働率を更新できる', () => {
      const assignee = WbsAssignee.create({
        wbsId: 1,
        userId: 'user-1',
        rate: 0.8,
        costPerHour: 5000,
        seq: 1
      });

      expect(assignee.getRate()).toBe(0.8);

      assignee.updateRate(0.6);
      expect(assignee.getRate()).toBe(0.6);
    });
  });

  describe('updateCostPerHour', () => {
    it('時間単価を更新できる', () => {
      const assignee = WbsAssignee.create({
        wbsId: 1,
        userId: 'user-1',
        rate: 0.8,
        costPerHour: 5000,
        seq: 1
      });

      expect(assignee.getCostPerHour()).toBe(5000);

      assignee.updateCostPerHour(6000);
      expect(assignee.getCostPerHour()).toBe(6000);
    });
  });
});
