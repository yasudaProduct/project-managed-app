import { evaluateMilestone } from '@/domains/milestone/milestone-forecast';

/**
 * マイルストーンの達成見込み（docs/plans/progress-management-analysis-requirements.md §7.2）。
 * - フェーズ完了型: フェーズのタスクがすべて完了で達成。見込みはフェーズの予測完了日（なければ予定ベース）
 * - タスク指定型: 指定タスクがすべて完了で達成。見込みは未完了タスクの予定終了日の最大値
 *   （予定終了日を過ぎた未完了タスクがあれば今日）
 * - イベント型: 達成日の記録だけ。見込みは出さない
 * 日付は暦日（UTC深夜0時）。
 */
describe('evaluateMilestone', () => {
  const d = (ymd: string) => new Date(`${ymd}T00:00:00.000Z`);
  const today = d('2026-11-01');
  const task = (status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED', plannedEnd: string | null) => ({
    status,
    plannedEnd: plannedEnd ? d(plannedEnd) : null,
  });

  it('達成日を記録していれば達成（予定日との差つき）', () => {
    expect(
      evaluateMilestone(
        {
          targetType: 'EVENT',
          dueDate: d('2026-10-30'),
          achievedAt: d('2026-11-01'),
          targetTasks: [],
          brokenLinkCount: 0,
          phaseForecastDate: null,
        },
        today
      )
    ).toMatchObject({ status: 'ACHIEVED', delayDays: 2 });
  });

  it('イベント型は見込みを出さず、予定日を過ぎて未記録なら期限超過', () => {
    const base = {
      targetType: 'EVENT' as const,
      achievedAt: null,
      targetTasks: [],
      brokenLinkCount: 0,
      phaseForecastDate: null,
    };
    expect(evaluateMilestone({ ...base, dueDate: d('2026-11-10') }, today).status).toBe('NO_FORECAST');
    expect(evaluateMilestone({ ...base, dueDate: d('2026-10-31') }, today).status).toBe('OVERDUE');
  });

  it('タスク指定型は、未完了タスクの予定終了日の最大値で見込む', () => {
    const result = evaluateMilestone(
      {
        targetType: 'TASKS',
        dueDate: d('2026-11-20'),
        achievedAt: null,
        targetTasks: [task('COMPLETED', '2026-11-25'), task('IN_PROGRESS', '2026-11-15'), task('NOT_STARTED', '2026-11-18')],
        brokenLinkCount: 0,
        phaseForecastDate: null,
      },
      today
    );

    expect(result).toEqual({
      status: 'ON_TRACK',
      forecastDate: d('2026-11-18'),
      delayDays: -2,
      completedCount: 1,
      totalCount: 3,
      brokenLinkCount: 0,
    });
  });

  it('予定終了日を過ぎた未完了タスクがあれば、見込みは今日以降になる', () => {
    const result = evaluateMilestone(
      {
        targetType: 'TASKS',
        dueDate: d('2026-10-31'),
        achievedAt: null,
        targetTasks: [task('IN_PROGRESS', '2026-10-25')],
        brokenLinkCount: 0,
        phaseForecastDate: null,
      },
      d('2026-10-28')
    );

    expect(result.forecastDate).toEqual(d('2026-10-28'));
    expect(result.status).toBe('ON_TRACK');
  });

  it('見込みが予定日より後なら遅延見込み', () => {
    const result = evaluateMilestone(
      {
        targetType: 'TASKS',
        dueDate: d('2026-11-10'),
        achievedAt: null,
        targetTasks: [task('IN_PROGRESS', '2026-11-15')],
        brokenLinkCount: 0,
        phaseForecastDate: null,
      },
      today
    );

    expect(result).toMatchObject({ status: 'AT_RISK', delayDays: 5 });
  });

  it('対象タスクがすべて完了なら達成', () => {
    expect(
      evaluateMilestone(
        {
          targetType: 'TASKS',
          dueDate: d('2026-11-10'),
          achievedAt: null,
          targetTasks: [task('COMPLETED', '2026-11-15')],
          brokenLinkCount: 0,
          phaseForecastDate: null,
        },
        today
      ).status
    ).toBe('ACHIEVED');
  });

  it('予定日を過ぎて未達成なら期限超過', () => {
    expect(
      evaluateMilestone(
        {
          targetType: 'TASKS',
          dueDate: d('2026-10-30'),
          achievedAt: null,
          targetTasks: [task('IN_PROGRESS', '2026-11-15')],
          brokenLinkCount: 0,
          phaseForecastDate: null,
        },
        today
      )
    ).toMatchObject({ status: 'OVERDUE', delayDays: 16 });
  });

  it('フェーズ完了型はフェーズの予測完了日（Earned Schedule）を優先する', () => {
    const result = evaluateMilestone(
      {
        targetType: 'PHASE',
        dueDate: d('2026-11-20'),
        achievedAt: null,
        targetTasks: [task('IN_PROGRESS', '2026-11-15')],
        brokenLinkCount: 0,
        phaseForecastDate: d('2026-11-25'),
      },
      today
    );

    expect(result).toMatchObject({ status: 'AT_RISK', forecastDate: d('2026-11-25'), delayDays: 5 });
  });

  it('対象タスクがない（紐付けが切れた・フェーズにタスクがない）なら対象なし', () => {
    expect(
      evaluateMilestone(
        {
          targetType: 'TASKS',
          dueDate: d('2026-11-20'),
          achievedAt: null,
          targetTasks: [],
          brokenLinkCount: 2,
          phaseForecastDate: null,
        },
        today
      )
    ).toMatchObject({ status: 'NO_TARGET', brokenLinkCount: 2 });
  });
});
