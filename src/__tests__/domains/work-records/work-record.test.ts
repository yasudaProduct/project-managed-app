import { WorkRecord } from "@/domains/work-records/work-recoed";

describe('WorkRecord', () => {
  const taskId = 1;
  const startDate = new Date('2025-01-01');
  const endDate = new Date('2025-01-01');
  const manHours = 8;

  describe('create', () => {
    it('作業記録を作成できること', () => {
      const workRecord = WorkRecord.create({
        userId: 'user-id-1',
        taskId,
        startDate,
        endDate,
        manHours
      });

      expect(workRecord).toBeInstanceOf(WorkRecord);
      expect(workRecord.id).toBeUndefined();
      expect(workRecord.taskId).toBe(taskId);
      expect(workRecord.startDate).toBe(startDate);
      expect(workRecord.endDate).toBe(endDate);
      expect(workRecord.manHours).toBe(manHours);
    });

    it('工数が0未満の場合はエラーが発生する', () => {

    })
  });

  describe('createFromDb', () => {
    it('ID、タスクID、開始日、終了日、工数から作業記録を作成できること', () => {
      const workRecord = WorkRecord.createFromDb({
        id: 1,
        userId: 'user-id-1',
        taskId,
        startDate,
        endDate,
        manHours
      });

      expect(workRecord).toBeInstanceOf(WorkRecord);
      expect(workRecord.id).toBe(1);
      expect(workRecord.userId).toBe('user-id-1');
      expect(workRecord.taskId).toBe(taskId);
      expect(workRecord.startDate).toBe(startDate);
      expect(workRecord.endDate).toBe(endDate);
      expect(workRecord.manHours).toBe(manHours);
    });
  });
});