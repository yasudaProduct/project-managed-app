import { detectTaskDelay, compareTaskDelays } from '@/domains/task/task-delay';

/**
 * タスクの遅れ・期限間近の判定。
 * 日付はすべて暦日（UTC深夜0時）で比較する。today も呼び出し側で暦日に変換して渡す。
 */
describe('detectTaskDelay', () => {
  const today = new Date('2026-10-31T00:00:00.000Z');
  const d = (ymd: string) => new Date(`${ymd}T00:00:00.000Z`);

  it('予定終了日を過ぎて未完了なら終了遅れ（遅延日数つき）', () => {
    expect(
      detectTaskDelay(
        { status: 'IN_PROGRESS', plannedStart: d('2026-10-01'), plannedEnd: d('2026-10-28') },
        today,
        1
      )
    ).toEqual({ kind: 'END_OVERDUE', days: 3 });
  });

  it('予定開始日を過ぎて未着手なら開始遅れ', () => {
    expect(
      detectTaskDelay(
        { status: 'NOT_STARTED', plannedStart: d('2026-10-29'), plannedEnd: d('2026-11-10') },
        today,
        1
      )
    ).toEqual({ kind: 'START_OVERDUE', days: 2 });
  });

  it('予定開始日が今日の未着手タスクは遅れではない', () => {
    expect(
      detectTaskDelay(
        { status: 'NOT_STARTED', plannedStart: d('2026-10-31'), plannedEnd: d('2026-11-10') },
        today,
        1
      )
    ).toBeNull();
  });

  it('終了遅れと開始遅れの両方に当たる場合は終了遅れを優先する', () => {
    expect(
      detectTaskDelay(
        { status: 'NOT_STARTED', plannedStart: d('2026-10-20'), plannedEnd: d('2026-10-30') },
        today,
        1
      )
    ).toEqual({ kind: 'END_OVERDUE', days: 1 });
  });

  it('予定終了日が期限間近の日数以内なら期限間近（残日数つき、本日は0）', () => {
    expect(
      detectTaskDelay(
        { status: 'IN_PROGRESS', plannedStart: d('2026-10-01'), plannedEnd: d('2026-10-31') },
        today,
        1
      )
    ).toEqual({ kind: 'DUE_SOON', days: 0 });
    expect(
      detectTaskDelay(
        { status: 'IN_PROGRESS', plannedStart: d('2026-10-01'), plannedEnd: d('2026-11-02') },
        today,
        2
      )
    ).toEqual({ kind: 'DUE_SOON', days: 2 });
  });

  it('期限間近の日数より先の予定終了日は対象外', () => {
    expect(
      detectTaskDelay(
        { status: 'IN_PROGRESS', plannedStart: d('2026-10-01'), plannedEnd: d('2026-11-03') },
        today,
        2
      )
    ).toBeNull();
  });

  it('完了・保留のタスクは対象外', () => {
    const late = { plannedStart: d('2026-10-01'), plannedEnd: d('2026-10-10') };
    expect(detectTaskDelay({ ...late, status: 'COMPLETED' }, today, 1)).toBeNull();
    expect(detectTaskDelay({ ...late, status: 'ON_HOLD' }, today, 1)).toBeNull();
  });

  it('予定日が未設定なら対象外', () => {
    expect(
      detectTaskDelay({ status: 'NOT_STARTED', plannedStart: null, plannedEnd: null }, today, 1)
    ).toBeNull();
  });

  it('時刻成分を持つ日付でも暦日で比較する', () => {
    expect(
      detectTaskDelay(
        {
          status: 'IN_PROGRESS',
          plannedStart: d('2026-10-01'),
          plannedEnd: new Date('2026-10-30T15:00:00.000Z'),
        },
        new Date('2026-10-31T09:00:00.000Z'),
        1
      )
    ).toEqual({ kind: 'END_OVERDUE', days: 1 });
  });
});

describe('compareTaskDelays', () => {
  it('終了遅れ→開始遅れ→期限間近の順。遅れは日数の多い順、期限間近は残日数の少ない順', () => {
    const delays = [
      { kind: 'DUE_SOON' as const, days: 1 },
      { kind: 'START_OVERDUE' as const, days: 2 },
      { kind: 'END_OVERDUE' as const, days: 1 },
      { kind: 'DUE_SOON' as const, days: 0 },
      { kind: 'END_OVERDUE' as const, days: 5 },
    ];

    expect([...delays].sort(compareTaskDelays)).toEqual([
      { kind: 'END_OVERDUE', days: 5 },
      { kind: 'END_OVERDUE', days: 1 },
      { kind: 'START_OVERDUE', days: 2 },
      { kind: 'DUE_SOON', days: 0 },
      { kind: 'DUE_SOON', days: 1 },
    ]);
  });
});
