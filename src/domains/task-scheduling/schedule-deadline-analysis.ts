/**
 * スケジュール算出結果と「締切・現行予定」の比較分析（純粋関数）
 *
 * - 差分（相対）: 算出結果 vs 現行予定(yotei) の開始/終了のズレ日数
 * - 締切超過（絶対）: 算出終了 vs 基準終了(kijun) / プロジェクト終了 / マイルストーン
 *
 * 単位はすべて暦日（締切はカレンダー日付のため直感的）。
 */

export interface DeadlineAnalysisInput {
  /** 算出された開始日（無ければ分析しない） */
  computedStart?: Date;
  /** 算出された終了日（無ければ分析しない） */
  computedEnd?: Date;
  /** 現行予定の開始日(yotei) */
  currentStart?: Date;
  /** 現行予定の終了日(yotei) */
  currentEnd?: Date;
  /** 基準終了日(kijun) */
  baselineEnd?: Date;
  /** プロジェクト終了日 */
  projectEnd?: Date;
  /** マイルストーン一覧 */
  milestones: { name: string; date: Date }[];
}

export interface DeadlineAnalysisResult {
  /** 算出開始 − 現行予定開始（+ = 後ろ倒し / − = 前倒し） */
  startDiffDays?: number;
  /** 算出終了 − 現行予定終了 */
  endDiffDays?: number;
  /** 算出終了 − 基準終了（> 0 で超過） */
  baselineEndDiffDays?: number;
  /** 算出終了 − プロジェクト終了（> 0 で超過） */
  projectEndDiffDays?: number;
  /** 間に合わないマイルストーン */
  missedMilestones: { name: string; date: Date }[];
}

const DAY_MS = 24 * 60 * 60 * 1000;

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/** a − b の暦日差（正 = a が後ろ） */
function diffDays(a: Date, b: Date): number {
  return Math.round(
    (startOfDay(a).getTime() - startOfDay(b).getTime()) / DAY_MS,
  );
}

export function analyzeDeadlines(
  input: DeadlineAnalysisInput,
): DeadlineAnalysisResult {
  const {
    computedStart,
    computedEnd,
    currentStart,
    currentEnd,
    baselineEnd,
    projectEnd,
    milestones,
  } = input;

  const result: DeadlineAnalysisResult = { missedMilestones: [] };

  // 算出結果が無い（未算出/エラー）タスクは分析対象外
  if (!computedEnd) {
    return result;
  }

  if (computedStart && currentStart) {
    result.startDiffDays = diffDays(computedStart, currentStart);
  }
  if (currentEnd) {
    result.endDiffDays = diffDays(computedEnd, currentEnd);
  }
  if (baselineEnd) {
    result.baselineEndDiffDays = diffDays(computedEnd, baselineEnd);
  }
  if (projectEnd) {
    result.projectEndDiffDays = diffDays(computedEnd, projectEnd);
  }

  // マイルストーン超過: 「本来そのマイルストーンまでに終わるはず(committedEnd<=M)
  // だったのに、算出では超える(M<computedEnd)」ものを間に合わないとする。
  const committedEnd = baselineEnd ?? currentEnd;
  if (committedEnd) {
    const computedEndMs = startOfDay(computedEnd).getTime();
    const committedEndMs = startOfDay(committedEnd).getTime();
    for (const m of milestones) {
      const milestoneMs = startOfDay(m.date).getTime();
      if (committedEndMs <= milestoneMs && milestoneMs < computedEndMs) {
        result.missedMilestones.push({ name: m.name, date: m.date });
      }
    }
  }

  return result;
}
