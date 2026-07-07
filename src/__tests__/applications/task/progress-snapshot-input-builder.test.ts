import { buildProgressSnapshotInput } from '@/applications/task/progress-snapshot-input-builder';
import { Task } from '@/domains/task/task';
import { TaskNo } from '@/domains/task/value-object/task-id';
import { TaskStatus } from '@/domains/task/value-object/task-status';
import { Period } from '@/domains/task/period';
import { PeriodType } from '@/domains/task/value-object/period-type';
import { ManHour } from '@/domains/task/man-hour';
import { ManHourType } from '@/domains/task/value-object/man-hour-type';

describe('buildProgressSnapshotInput', () => {
  const yoteiStart = new Date('2025-06-01');
  const yoteiEnd = new Date('2025-06-30');
  const kijunStart = new Date('2025-05-01');
  const kijunEnd = new Date('2025-05-31');

  const makePeriod = (
    type: 'KIJUN' | 'YOTEI',
    startDate: Date,
    endDate: Date,
    kosu: number
  ): Period =>
    Period.create({
      type: new PeriodType({ type }),
      startDate,
      endDate,
      manHours: [
        ManHour.create({ type: new ManHourType({ type: 'NORMAL' }), kosu }),
      ],
    });

  const makeTask = (periods: Period[]): Task =>
    Task.createFromDb({
      id: 10,
      taskNo: TaskNo.reconstruct('D1-0001'),
      wbsId: 1,
      name: '画面から作成したタスク',
      status: new TaskStatus({ status: 'IN_PROGRESS' }),
      periods,
      progressRate: 50,
    });

  describe('基準（KIJUN）期間が無いタスク', () => {
    it('基準工数は予定工数にフォールバックする（BACから漏れない）', () => {
      const task = makeTask([makePeriod('YOTEI', yoteiStart, yoteiEnd, 30)]);

      const input = buildProgressSnapshotInput({
        task,
        costPerHour: 5000,
        actualStart: null,
        actualEnd: null,
      });

      expect(input.plannedManHours).toBe(30);
      expect(input.baseManHours).toBe(30);
    });

    it('基準期間の日付は予定期間にフォールバックする', () => {
      const task = makeTask([makePeriod('YOTEI', yoteiStart, yoteiEnd, 30)]);

      const input = buildProgressSnapshotInput({
        task,
        costPerHour: 5000,
        actualStart: null,
        actualEnd: null,
      });

      expect(input.baseStart).toEqual(yoteiStart);
      expect(input.baseEnd).toEqual(yoteiEnd);
    });
  });

  describe('基準（KIJUN）期間があるタスク', () => {
    it('基準工数・基準日付はKIJUN期間の値をそのまま使う（回帰確認）', () => {
      const task = makeTask([
        makePeriod('KIJUN', kijunStart, kijunEnd, 100),
        makePeriod('YOTEI', yoteiStart, yoteiEnd, 120),
      ]);

      const input = buildProgressSnapshotInput({
        task,
        costPerHour: 5000,
        actualStart: null,
        actualEnd: null,
      });

      expect(input.baseManHours).toBe(100);
      expect(input.plannedManHours).toBe(120);
      expect(input.baseStart).toEqual(kijunStart);
      expect(input.baseEnd).toEqual(kijunEnd);
    });

    it('KIJUN期間があり工数0の場合はフォールバックせず0のまま（明示的な基準0を尊重）', () => {
      const task = makeTask([
        makePeriod('KIJUN', kijunStart, kijunEnd, 0),
        makePeriod('YOTEI', yoteiStart, yoteiEnd, 120),
      ]);

      const input = buildProgressSnapshotInput({
        task,
        costPerHour: 5000,
        actualStart: null,
        actualEnd: null,
      });

      expect(input.baseManHours).toBe(0);
      expect(input.baseStart).toEqual(kijunStart);
    });
  });

  describe('期間が全く無いタスク', () => {
    it('工数0・日付nullで構築する', () => {
      const task = makeTask([]);

      const input = buildProgressSnapshotInput({
        task,
        costPerHour: 5000,
        actualStart: null,
        actualEnd: null,
      });

      expect(input.plannedManHours).toBe(0);
      expect(input.baseManHours).toBe(0);
      expect(input.baseStart).toBeNull();
      expect(input.baseEnd).toBeNull();
    });
  });
});
