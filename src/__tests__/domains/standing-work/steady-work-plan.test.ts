import { SteadyWorkPlan } from '@/domains/standing-work/steady-work-plan';

/**
 * 定常枠（Steady Work Plan）。
 * docs/plans/non-project-work-management.md §6.2, §6.3, §11.3
 * - 単位は PER_DAY（1営業日あたり）/ PER_MONTH（1か月あたり）
 * - hours ≥ 0、validFrom ≤ validTo。validTo なしは無期限
 * - 同じタスクの枠は有効期間が重ならない
 */
describe('SteadyWorkPlan', () => {
  const d = (ymd: string) => new Date(`${ymd}T00:00:00.000Z`);

  describe('create', () => {
    it('単位・時間・有効期間から作成できること', () => {
      const plan = SteadyWorkPlan.create({
        taskId: 10,
        unit: 'PER_DAY',
        hours: 1,
        validFrom: d('2026-04-01'),
        validTo: d('2027-03-31'),
      });

      expect(plan.id).toBeUndefined();
      expect(plan.taskId).toBe(10);
      expect(plan.unit).toBe('PER_DAY');
      expect(plan.hours).toBe(1);
      expect(plan.validFrom).toEqual(d('2026-04-01'));
      expect(plan.validTo).toEqual(d('2027-03-31'));
    });

    it('終了日なし（無期限）で作成できること', () => {
      const plan = SteadyWorkPlan.create({
        taskId: 10,
        unit: 'PER_MONTH',
        hours: 20,
        validFrom: d('2026-04-01'),
      });

      expect(plan.validTo).toBeUndefined();
    });

    it('時間 0 は許容すること', () => {
      expect(() =>
        SteadyWorkPlan.create({ taskId: 10, unit: 'PER_DAY', hours: 0, validFrom: d('2026-04-01') })
      ).not.toThrow();
    });

    it('時間が負または数値でない場合は例外になること', () => {
      expect(() =>
        SteadyWorkPlan.create({ taskId: 10, unit: 'PER_DAY', hours: -1, validFrom: d('2026-04-01') })
      ).toThrow('定常枠の時間は0以上の数値で指定してください');
      expect(() =>
        SteadyWorkPlan.create({ taskId: 10, unit: 'PER_DAY', hours: Number.NaN, validFrom: d('2026-04-01') })
      ).toThrow('定常枠の時間は0以上の数値で指定してください');
    });

    it('開始日が終了日より後の場合は例外になること', () => {
      expect(() =>
        SteadyWorkPlan.create({
          taskId: 10,
          unit: 'PER_DAY',
          hours: 1,
          validFrom: d('2026-05-01'),
          validTo: d('2026-04-30'),
        })
      ).toThrow('定常枠の開始日は終了日以前にしてください');
    });

    it('開始日と終了日が同じ日は許容すること', () => {
      expect(() =>
        SteadyWorkPlan.create({
          taskId: 10,
          unit: 'PER_DAY',
          hours: 1,
          validFrom: d('2026-05-01'),
          validTo: d('2026-05-01'),
        })
      ).not.toThrow();
    });
  });

  describe('createFromDb', () => {
    it('ID付きで復元できること', () => {
      const plan = SteadyWorkPlan.createFromDb({
        id: 5,
        taskId: 10,
        unit: 'PER_MONTH',
        hours: 20,
        validFrom: d('2026-04-01'),
        validTo: undefined,
      });

      expect(plan.id).toBe(5);
      expect(plan.unit).toBe('PER_MONTH');
    });
  });

  describe('isActiveOn', () => {
    const plan = SteadyWorkPlan.create({
      taskId: 10,
      unit: 'PER_DAY',
      hours: 1,
      validFrom: d('2026-05-10'),
      validTo: d('2026-05-20'),
    });

    it('有効期間内（両端含む）は true、期間外は false を返すこと', () => {
      expect(plan.isActiveOn(d('2026-05-09'))).toBe(false);
      expect(plan.isActiveOn(d('2026-05-10'))).toBe(true);
      expect(plan.isActiveOn(d('2026-05-15'))).toBe(true);
      expect(plan.isActiveOn(d('2026-05-20'))).toBe(true);
      expect(plan.isActiveOn(d('2026-05-21'))).toBe(false);
    });

    it('終了日なしの枠は開始日以降ずっと有効であること', () => {
      const openEnded = SteadyWorkPlan.create({
        taskId: 10,
        unit: 'PER_DAY',
        hours: 1,
        validFrom: d('2026-05-10'),
      });

      expect(openEnded.isActiveOn(d('2026-05-09'))).toBe(false);
      expect(openEnded.isActiveOn(d('2030-12-31'))).toBe(true);
    });

    it('時刻を持つ日付でも日付単位で判定すること', () => {
      expect(plan.isActiveOn(new Date(2026, 4, 20, 23, 59))).toBe(true);
      expect(plan.isActiveOn(new Date(2026, 4, 21, 0, 1))).toBe(false);
    });
  });

  describe('overlapsWith / assertNoOverlap', () => {
    const make = (from: string, to?: string) =>
      SteadyWorkPlan.create({
        taskId: 10,
        unit: 'PER_DAY',
        hours: 1,
        validFrom: d(from),
        validTo: to ? d(to) : undefined,
      });

    it('期間が接する日（終了日 = 開始日）は重なりとみなすこと', () => {
      expect(make('2026-05-01', '2026-05-10').overlapsWith(make('2026-05-10', '2026-05-20'))).toBe(true);
    });

    it('前の枠の翌日から始まる枠は重ならないこと', () => {
      expect(make('2026-05-01', '2026-05-09').overlapsWith(make('2026-05-10', '2026-05-20'))).toBe(false);
      expect(make('2026-05-10', '2026-05-20').overlapsWith(make('2026-05-01', '2026-05-09'))).toBe(false);
    });

    it('終了日なしの枠同士は必ず重なること', () => {
      expect(make('2026-05-01').overlapsWith(make('2027-01-01'))).toBe(true);
    });

    it('終了日なしの枠は、それより前に終わる枠とは重ならないこと', () => {
      expect(make('2026-06-01').overlapsWith(make('2026-05-01', '2026-05-31'))).toBe(false);
    });

    it('assertNoOverlap は重なる枠があれば例外、なければ何もしないこと', () => {
      expect(() =>
        SteadyWorkPlan.assertNoOverlap([make('2026-05-01', '2026-05-31'), make('2026-06-01')])
      ).not.toThrow();
      expect(() =>
        SteadyWorkPlan.assertNoOverlap([make('2026-05-01', '2026-05-31'), make('2026-05-15')])
      ).toThrow('定常枠の有効期間が重なっています');
    });

    it('assertNoOverlap は空配列・1件では何もしないこと', () => {
      expect(() => SteadyWorkPlan.assertNoOverlap([])).not.toThrow();
      expect(() => SteadyWorkPlan.assertNoOverlap([make('2026-05-01')])).not.toThrow();
    });
  });
});
