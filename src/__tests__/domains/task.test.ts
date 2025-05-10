import { Task } from "@/domains/task/task";
import { TaskId } from "@/domains/task/value-object/task-id";
import { TaskStatus } from "@/domains/task/value-object/project-status";
import { Phase } from "@/domains/phase/phase";
import { PhaseCode } from "@/domains/phase/phase-code";
import { Assignee } from "@/domains/task/assignee";
import { Period } from "@/domains/task/period";
import { PeriodType } from "@/domains/task/value-object/period-type";
import { ManHour } from "@/domains/task/man-hour";
import { ManHourType } from "@/domains/task/value-object/man-hour-type";
import { WorkRecord } from "@/domains/work-records/work-recoed";

describe('Task', () => {
  const taskId = TaskId.reconstruct('D1-0001');
  const wbsId = 1;
  const name = 'テストタスク';
  const status = new TaskStatus({ status: 'NOT_STARTED' });
  const startDate = new Date('2025-01-01');
  const endDate = new Date('2025-01-31');
  const periodType = new PeriodType({ type: 'YOTEI' });
  const manHourType = new ManHourType({ type: 'NORMAL' });

  describe('create', () => {
    it('ID、WBS ID、名前、ステータスからタスクを作成できること', () => {
      const task = Task.create({
        id: taskId,
        wbsId,
        name,
        status
      });

      expect(task).toBeInstanceOf(Task);
      expect(task.id).toBe(taskId);
      expect(task.wbsId).toBe(wbsId);
      expect(task.name).toBe(name);
      expect(task.status).toBe(status);
    });

    it('オプションのフィールドも一緒に作成できること', () => {
      const phaseId = 1;
      const assigneeId = 'user-1';
      const periods = [
        Period.create({
          startDate,
          endDate,
          type: periodType,
          manHours: [ManHour.create({ kosu: 8, type: manHourType })]
        })
      ];

      const task = Task.create({
        id: taskId,
        wbsId,
        name,
        status,
        phaseId,
        assigneeId,
        periods
      });

      expect(task.phaseId).toBe(phaseId);
      expect(task.assigneeId).toBe(assigneeId);
      expect(task.periods).toBe(periods);
    });
  });

  describe('createFromDb', () => {
    it('DB関連のフィールドも含めてタスクを作成できること', () => {
      const phaseId = 1;
      const phase = Phase.createFromDb({
        id: phaseId,
        name: '設計フェーズ',
        code: new PhaseCode('D'),
        seq: 1
      });

      const assigneeId = 'user-1';
      const assignee = Assignee.createFromDb({
        id: assigneeId,
        name: 'yamada',
        displayName: '山田太郎'
      });

      const periods = [
        Period.createFromDb({
          id: 1,
          startDate,
          endDate,
          type: periodType,
          manHours: [ManHour.createFromDb({
            id: 1,
            kosu: 8,
            type: manHourType
          })]
        })
      ];

      const workRecords = [
        WorkRecord.createFromDb({
          id: 1,
          taskId,
          startDate,
          endDate,
          manHours: 6
        })
      ];

      const createdAt = new Date('2025-01-01');
      const updatedAt = new Date('2025-01-02');

      const task = Task.createFromDb({
        id: taskId,
        wbsId,
        name,
        status,
        phaseId,
        phase,
        assigneeId,
        assignee,
        periods,
        workRecords,
        createdAt,
        updatedAt
      });

      expect(task).toBeInstanceOf(Task);
      expect(task.id).toBe(taskId);
      expect(task.wbsId).toBe(wbsId);
      expect(task.name).toBe(name);
      expect(task.status).toBe(status);
      expect(task.phaseId).toBe(phaseId);
      expect(task.phase).toBe(phase);
      expect(task.assigneeId).toBe(assigneeId);
      expect(task.assignee).toBe(assignee);
      expect(task.periods).toBe(periods);
      expect(task.workRecords).toBe(workRecords);
      expect(task.createdAt).toBe(createdAt);
      expect(task.updatedAt).toBe(updatedAt);
    });
  });

  describe('isEqual', () => {
    it('同じIDのタスクは等しいと判定されること', () => {
      const task1 = Task.create({
        id: taskId,
        wbsId,
        name,
        status
      });

      const task2 = Task.create({
        id: taskId,
        wbsId: 2,
        name: '異なる名前',
        status: new TaskStatus({ status: 'IN_PROGRESS' })
      });

      expect(task1.isEqual(task2)).toBe(true);
    });

    it('異なるIDのタスクは等しくないと判定されること', () => {
      const task1 = Task.create({
        id: taskId,
        wbsId,
        name,
        status
      });

      const task2 = Task.create({
        id: TaskId.reconstruct('D1-0002'),
        wbsId,
        name,
        status
      });

      expect(task1.isEqual(task2)).toBe(false);
    });
  });

  describe('getStatus', () => {
    it('ステータス値を取得できること', () => {
      const task = Task.create({
        id: taskId,
        wbsId,
        name,
        status: new TaskStatus({ status: 'IN_PROGRESS' })
      });

      expect(task.getStatus()).toBe('IN_PROGRESS');
    });
  });

  describe('予実管理メソッド', () => {
    let task: Task;
    const yoteiStart = new Date('2025-02-01');
    const yoteiEnd = new Date('2025-02-28');
    const yoteiKosu = 40;

    beforeEach(() => {
      // テスト用のタスク作成
      task = Task.create({
        id: taskId,
        wbsId,
        name,
        status,
        periods: []
      });
    });

    describe('updateYotei', () => {
      it('予定がない場合、新しい予定を追加できること', () => {
        task.updateYotei({
          startDate: yoteiStart,
          endDate: yoteiEnd,
          kosu: yoteiKosu
        });

        expect(task.periods?.length).toBe(1);
        expect(task.getYoteiStart()).toEqual(yoteiStart);
        expect(task.getYoteiEnd()).toEqual(yoteiEnd);
        expect(task.getYoteiKosus()).toBe(yoteiKosu);
      });

      it('既存の予定を更新できること', () => {
        // 予定を追加
        task.updateYotei({
          startDate: yoteiStart,
          endDate: yoteiEnd,
          kosu: yoteiKosu
        });

        // 予定を更新
        const newStart = new Date('2025-03-01');
        const newEnd = new Date('2025-03-15');
        const newKosu = 20;

        task.updateYotei({
          startDate: newStart,
          endDate: newEnd,
          kosu: newKosu
        });

        expect(task.periods?.length).toBe(1);
        expect(task.getYoteiStart()).toEqual(newStart);
        expect(task.getYoteiEnd()).toEqual(newEnd);
        expect(task.getYoteiKosus()).toBe(newKosu);
      });
    });

    describe('updateKijun', () => {
      it('基準がない場合、新しい基準を追加できること', () => {
        const kijunStart = new Date('2025-04-01');
        const kijunEnd = new Date('2025-04-30');
        const kijunKosu = 50;

        task.updateKijun(kijunStart, kijunEnd, kijunKosu);

        // 予定がない状態では period.length は 1
        expect(task.periods?.length).toBe(1);
        expect(task.getKijunStart()).toEqual(kijunStart);
        expect(task.getKijunEnd()).toEqual(kijunEnd);
        expect(task.getKijunKosus()).toBe(kijunKosu);
      });
    });
  });
});