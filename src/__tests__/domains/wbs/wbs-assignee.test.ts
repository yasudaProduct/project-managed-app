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
  });

  describe('取得メソッド', () => {
    let assignee: WbsAssignee;
    beforeEach(() => {
      assignee = WbsAssignee.create({
        wbsId: 1,
        userId: 'user-1',
        rate: 0.8,
        costPerHour: 5000,
        seq: 1,
      });
    });

    describe('getRate', () => {
      it('稼働率を取得できる', () => {
        const rate = assignee.getRate();
        expect(rate).toBe(0.8);
      });
    });

    describe('getCostPerHour', () => {
      it('時間単価を取得できる', () => {
        expect(assignee.getCostPerHour()).toBe(5000);
      });
    });

    describe('getSeq', () => {
      it('順番を取得できる', () => {
        expect(assignee.seq).toBe(1);
      });
    });
  });

  describe('更新メソッド', () => {

    let assignee: WbsAssignee;
    beforeEach(() => {
      assignee = WbsAssignee.create({
        wbsId: 1,
        userId: 'user-1',
        rate: 0.8,
        costPerHour: 5000,
        seq: 1
      });
    });

    describe('updateRate', () => {
      it('稼働率を更新できる', () => {
        expect(assignee.getRate()).toBe(0.8);

        assignee.updateRate(0.6);
        expect(assignee.getRate()).toBe(0.6);
      });
    });

    describe('updateCostPerHour', () => {
      it('時間単価を更新できる', () => {
        expect(assignee.getCostPerHour()).toBe(5000);

        assignee.updateCostPerHour(6000);
        expect(assignee.getCostPerHour()).toBe(6000);
      });
    });
  });
});
