import { WorkRecord } from "@/domains/work-records/work-recoed";
import { TaskId } from "@/domains/task/value-object/task-id";

describe('WorkRecord', () => {
  const taskId = TaskId.reconstruct('D1-0001');
  const startDate = new Date('2025-01-01');
  const endDate = new Date('2025-01-01');
  const manHours = 8;

  describe('create', () => {
    it('タスクID、開始日、終了日、工数から作業記録を作成できること', () => {
      const workRecord = WorkRecord.create({
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
  });

  describe('createFromDb', () => {
    it('ID、タスクID、開始日、終了日、工数から作業記録を作成できること', () => {
      const workRecord = WorkRecord.createFromDb({
        id: 1,
        taskId,
        startDate,
        endDate,
        manHours
      });

      expect(workRecord).toBeInstanceOf(WorkRecord);
      expect(workRecord.id).toBe(1);
      expect(workRecord.taskId).toBe(taskId);
      expect(workRecord.startDate).toBe(startDate);
      expect(workRecord.endDate).toBe(endDate);
      expect(workRecord.manHours).toBe(manHours);
    });
  });
});