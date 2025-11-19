import { Task } from "@/domains/task/task";
import { TaskNo } from "@/domains/task/value-object/task-id";
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
  const taskNo = TaskNo.reconstruct('D1-0001');
  const taskId = 1;
  const wbsId = 1;
  const name = 'テストタスク';
  const status = new TaskStatus({ status: 'NOT_STARTED' });
  const startDate = new Date('2025-01-01');
  const endDate = new Date('2025-01-31');
  const periodType = new PeriodType({ type: 'YOTEI' });
  const manHourType = new ManHourType({ type: 'NORMAL' });
  const progressRate = 50;

  describe('create', () => {
    it('タスクを作成できること', () => {
      const task = Task.create({
        taskNo: taskNo,
        wbsId,
        name,
        status,
      });

      expect(task).toBeInstanceOf(Task);
      expect(task.taskNo).toBe(taskNo);
      expect(task.wbsId).toBe(wbsId);
      expect(task.name).toBe(name);
      expect(task.status).toBe(status);
    });

    it('期間を作成できること', () => {
      const phaseId = 1;
      const assigneeId = 1;
      const periods = [
        Period.create({
          startDate,
          endDate,
          type: periodType,
          manHours: [ManHour.create({ kosu: 8, type: manHourType })]
        })
      ];
      const progressRate = 50;

      const task = Task.create({
        taskNo: taskNo,
        wbsId,
        name,
        status,
        phaseId,
        assigneeId,
        periods,
        progressRate,
      });

      expect(task).toBeInstanceOf(Task);
      expect(task.taskNo).toBe(taskNo);
      expect(task.wbsId).toBe(wbsId);
      expect(task.name).toBe(name);
      expect(task.status).toBe(status);
      expect(task.phaseId).toBe(phaseId);
      expect(task.assigneeId).toBe(assigneeId);
      expect(task.periods).toBe(periods);
      expect(task.progressRate).toBe(progressRate);
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

      const assigneeId = 1;
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
          userId: "user-id-1",
          taskId: taskId,
          startDate,
          endDate,
          manHours: 6
        })
      ];

      const task = Task.createFromDb({
        id: taskId,
        taskNo: taskNo,
        wbsId,
        name,
        status,
        phaseId,
        phase,
        assigneeId,
        assignee,
        periods,
        workRecords,
        progressRate,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      expect(task).toBeInstanceOf(Task);
      expect(task.taskNo).toBe(taskNo);
      expect(task.wbsId).toBe(wbsId);
      expect(task.name).toBe(name);
      expect(task.status).toBe(status);
      expect(task.phaseId).toBe(phaseId);
      expect(task.phase).toBe(phase);
      expect(task.assigneeId).toBe(assigneeId);
      expect(task.assignee).toBe(assignee);
      expect(task.periods).toBe(periods);
      expect(task.workRecords).toBe(workRecords);
      expect(task.createdAt).not.toBeNull();
      expect(task.updatedAt).not.toBeNull();
    });
  });

  describe('取得メソッド', () => {
    describe('getStatus', () => {
      it('ステータス値を取得できること', () => {
        const task = Task.create({
          taskNo: taskNo,
          wbsId,
          name,
          status: new TaskStatus({ status: 'IN_PROGRESS' })
        });

        expect(task.getStatus()).toBe('IN_PROGRESS');
      });
    });

    describe('getKijun', () => {
      it('基準を取得できること 1件', () => {
        const task = Task.create({
          taskNo: taskNo,
          wbsId,
          name,
          status: new TaskStatus({ status: 'IN_PROGRESS' }),
          periods: [
            Period.create({
              startDate: new Date('2025-01-01'),
              endDate: new Date('2025-01-31'),
              type: new PeriodType({ type: 'KIJUN' }),
              manHours: [ManHour.create({ kosu: 8, type: manHourType })]
            })
          ]
        });

        expect(task.getKijunStart()).toEqual(new Date('2025-01-01'));
        expect(task.getKijunEnd()).toEqual(new Date('2025-01-31'));
        expect(task.getKijunKosus()).toBe(8);
      });

      it('基準を取得できること 複数件', () => {
        // NOTE: 同一typeが複数ある場合が起きうるかは不明

        const task = Task.create({
          taskNo: taskNo,
          wbsId,
          name,
          status: new TaskStatus({ status: 'IN_PROGRESS' }),
          periods: [
            Period.create({
              startDate: new Date('2025-01-01'),
              endDate: new Date('2025-01-31'),
              type: new PeriodType({ type: 'KIJUN' }),
              manHours: [ManHour.create({ kosu: 8, type: manHourType })]
            }),
            Period.create({
              startDate: new Date('2025-03-01'),
              endDate: new Date('2025-03-31'),
              type: new PeriodType({ type: 'KIJUN' }),
              manHours: [ManHour.create({ kosu: 16, type: manHourType })]
            })
          ]
        });

        expect(task.getKijunStart()).toEqual(new Date('2025-03-01'));
        expect(task.getKijunEnd()).toEqual(new Date('2025-03-31'));
        expect(task.getKijunKosus()).toBe(16);
      });

      it('基準を取得できない場合はundefinedを返すこと', () => {
        const task = Task.create({
          taskNo: taskNo,
          wbsId,
          name,
          status: new TaskStatus({ status: 'IN_PROGRESS' }),
        });

        expect(task.getKijunStart()).toBeUndefined();
        expect(task.getKijunEnd()).toBeUndefined();
        expect(task.getKijunKosus()).toBeUndefined();
      });
    });

    describe('getYotei', () => {
      it('予定を取得できること 1件', () => {
        const task = Task.create({
          taskNo: taskNo,
          wbsId,
          name,
          status: new TaskStatus({ status: 'IN_PROGRESS' }),
          periods: [
            Period.create({
              startDate: new Date('2025-01-01'),
              endDate: new Date('2025-01-31'),
              type: new PeriodType({ type: 'YOTEI' }),
              manHours: [ManHour.create({ kosu: 8, type: manHourType })]
            })
          ]
        });

        expect(task.getYoteiStart()).toEqual(new Date('2025-01-01'));
        expect(task.getYoteiEnd()).toEqual(new Date('2025-01-31'));
        expect(task.getYoteiKosus()).toBe(8);
      });

      it('予定を取得できること 複数件', () => {
        const task = Task.create({
          taskNo: taskNo,
          wbsId,
          name,
          status: new TaskStatus({ status: 'IN_PROGRESS' }),
          periods: [
            Period.create({
              startDate: new Date('2025-01-01'),
              endDate: new Date('2025-01-31'),
              type: new PeriodType({ type: 'YOTEI' }),
              manHours: [ManHour.create({ kosu: 8, type: manHourType })]
            }),
            Period.create({
              startDate: new Date('2025-03-01'),
              endDate: new Date('2025-03-31'),
              type: new PeriodType({ type: 'YOTEI' }),
              manHours: [ManHour.create({ kosu: 16, type: manHourType })]
            })
          ]
        });

        expect(task.getYoteiStart()).toEqual(new Date('2025-03-01'));
        expect(task.getYoteiEnd()).toEqual(new Date('2025-03-31'));
        expect(task.getYoteiKosus()).toBe(16);
      });

      it('予定を取得できない場合はundefinedを返すこと', () => {
        const task = Task.create({
          taskNo: taskNo,
          wbsId,
          name,
          status: new TaskStatus({ status: 'IN_PROGRESS' }),
        });

        expect(task.getYoteiStart()).toBeUndefined();
        expect(task.getYoteiEnd()).toBeUndefined();
        expect(task.getYoteiKosus()).toBeUndefined();
      });
    });

    describe('getJisseki', () => {
      it('実績を取得できること 1件', () => {
        const task = Task.createFromDb({
          id: taskId,
          taskNo: taskNo,
          wbsId,
          name,
          status: new TaskStatus({ status: 'IN_PROGRESS' }),
          workRecords: [
            WorkRecord.create({
              userId: 'user-id-1',
              taskId: taskId,
              startDate: new Date('2025-01-01'),
              endDate: new Date('2025-01-31'),
              manHours: 8
            })
          ]
        });

        expect(task.getJissekiStart()).toEqual(new Date('2025-01-01'));
        expect(task.getJissekiEnd()).toEqual(new Date('2025-01-31'));
        expect(task.getJissekiKosus()).toBe(8);
      });

      it('実績を取得できること 複数件', () => {
        const task = Task.createFromDb({
          id: taskId,
          taskNo: taskNo,
          wbsId,
          name,
          status: new TaskStatus({ status: 'IN_PROGRESS' }),
          workRecords: [
            WorkRecord.create({
              userId: 'user-id-1',
              taskId: taskId,
              startDate: new Date('2025-01-01'),
              endDate: new Date('2025-01-31'),
              manHours: 8
            }),
            WorkRecord.create({
              userId: 'user-id-2',
              taskId: taskId,
              startDate: new Date('2025-03-01'),
              endDate: new Date('2025-03-31'),
              manHours: 16
            })
          ]
        });

        expect(task.getJissekiStart()).toEqual(new Date('2025-01-01'));
        expect(task.getJissekiEnd()).toEqual(new Date('2025-03-31'));
        expect(task.getJissekiKosus()).toBe(24);
      });
    });
  });

  describe('更新メソッド', () => {
    let task: Task;
    const yoteiStart = new Date('2025-02-01');
    const yoteiEnd = new Date('2025-02-28');
    const yoteiKosu = 40;

    beforeEach(() => {
      // テスト用のタスク作成
      task = Task.create({
        taskNo: taskNo,
        wbsId,
        name,
        status,
        periods: []
      });
    });

    describe('update', () => {
      it('更新できること', () => {
        const newName = '更新後タスク';
        const newStatus = new TaskStatus({ status: 'IN_PROGRESS' });
        const newAssigneeId = 1;
        const newPhaseId = 1;

        task.update({
          name: newName,
          status: newStatus,
          assigneeId: newAssigneeId,
          phaseId: newPhaseId,
        });

        expect(task.name).toBe(newName);
        expect(task.status).toStrictEqual(newStatus);
        expect(task.assigneeId).toBe(newAssigneeId);
        expect(task.phaseId).toBe(newPhaseId);
      });

      it('タスク名が空の場合、エラーを返すこと', () => {
        expect(() => {
          task.update({
            name: '',
            status: new TaskStatus({ status: 'NOT_STARTED' }),
          });
        }).toThrow('タスク名は必須です');
      });

      it('ステータスが空の場合、エラーを返すこと', () => {
        expect(() => {
          task.update({
            name: '更新後タスク',
            status: undefined as unknown as TaskStatus,
            assigneeId: 1,
            phaseId: 1,
          });
        }).toThrow('タスクステータスは必須です');
      });

      it('担当者が空の場合、エラーを返すこと', () => {
        expect(() => {
          task.update({
            name: '更新後タスク',
            status: new TaskStatus({ status: 'NOT_STARTED' }),
            assigneeId: undefined,
            phaseId: 1,
          });
        }).toThrow('担当者は必須です');
      });

      it('フェーズが空の場合、エラーを返すこと', () => {
        expect(() => {
          task.update({
            name: '更新後タスク',
            status: new TaskStatus({ status: 'NOT_STARTED' }),
            assigneeId: 1,
            phaseId: undefined,
          });
        }).toThrow('フェーズは必須です');
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
  });
});