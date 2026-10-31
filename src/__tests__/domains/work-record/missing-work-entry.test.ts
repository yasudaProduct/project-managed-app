import {
  listRecentBusinessDays,
  findMissingWorkEntryDates,
} from '@/domains/work-record/missing-work-entry';

/**
 * 実績（月報）の入力漏れ検出。
 * 作業者は月報を毎日入力する運用のため、
 * 「営業日・予定タスクあり・全日休暇でない・実績0時間」の日を入力漏れとする。
 */
const d = (ymd: string) => new Date(`${ymd}T00:00:00.000Z`);
const keys = (dates: Date[]) => dates.map((date) => date.toISOString().slice(0, 10));

describe('listRecentBusinessDays', () => {
  // 土日を休みとする判定（2026-10-31 は土曜）
  const isBusinessDay = (date: Date) => date.getUTCDay() !== 0 && date.getUTCDay() !== 6;

  it('終了日から遡って営業日だけを指定件数、古い順に返す', () => {
    expect(keys(listRecentBusinessDays(isBusinessDay, d('2026-10-30'), 3))).toEqual([
      '2026-10-28',
      '2026-10-29',
      '2026-10-30',
    ]);
  });

  it('終了日が休日なら直前の営業日から数える', () => {
    expect(keys(listRecentBusinessDays(isBusinessDay, d('2026-11-01'), 2))).toEqual([
      '2026-10-29',
      '2026-10-30',
    ]);
  });
});

describe('findMissingWorkEntryDates', () => {
  const businessDays = [d('2026-10-27'), d('2026-10-28'), d('2026-10-29'), d('2026-10-30')];

  it('予定タスクがあり実績のない営業日を返す', () => {
    expect(
      keys(
        findMissingWorkEntryDates({
          businessDays,
          plannedPeriods: [{ start: d('2026-10-01'), end: d('2026-11-30') }],
          recordedDateKeys: new Set(['2026-10-27', '2026-10-29']),
          dayOffDateKeys: new Set(),
        })
      )
    ).toEqual(['2026-10-28', '2026-10-30']);
  });

  it('全日休暇の日は入力漏れにしない', () => {
    expect(
      keys(
        findMissingWorkEntryDates({
          businessDays,
          plannedPeriods: [{ start: d('2026-10-01'), end: d('2026-11-30') }],
          recordedDateKeys: new Set(['2026-10-27', '2026-10-29']),
          dayOffDateKeys: new Set(['2026-10-28']),
        })
      )
    ).toEqual(['2026-10-30']);
  });

  it('予定タスクのない日は入力漏れにしない（予定期間の両端を含む）', () => {
    expect(
      keys(
        findMissingWorkEntryDates({
          businessDays,
          plannedPeriods: [{ start: d('2026-10-28'), end: d('2026-10-29') }],
          recordedDateKeys: new Set(),
          dayOffDateKeys: new Set(),
        })
      )
    ).toEqual(['2026-10-28', '2026-10-29']);
  });
});
