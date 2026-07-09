/**
 * イナズマ線（進捗線 / progress line）の幾何計算（React 非依存の純粋関数）。
 *
 * イナズマ線は基準日（today）の縦線に対し、各タスクの進捗を「日付軸上の位置」として
 * 点で表し、上から下へ結んだ折れ線。遅れているタスクは左へ、進んでいるタスクは右へ
 * 張り出し、稲妻状のジグザグになる。
 */

/** 進捗点の算出に必要なタスクの最小情報 */
export interface ProgressLineTask {
  startDate: Date;
  endDate: Date;
  /** 実効進捗率（0–100）。表示用の progress を使う */
  progress: number;
  isMilestone: boolean;
}

/** 折れ線の頂点 */
export interface ProgressLinePoint {
  x: number;
  y: number;
}

/** タスク行（進捗点の対象タスクと、その行の中心Y座標） */
export interface ProgressLineRow {
  task: ProgressLineTask;
  centerY: number;
}

/**
 * イナズマ線における1タスクの進捗点X座標を求める。
 *
 * 「基準日(today)を [start,end] にクランプした位置」を基準点とし、実績進捗に対応する
 * 日付位置との偏差（px）を today ライン(todayX)へ加算する。これにより:
 * - 進行中タスクは、予定より遅れていれば左・進んでいれば右へ張り出す
 * - 未着手の将来タスク(0%)・完了済みの過去タスク(100%)は基準線上(todayX)に乗る
 *   （MS Project の進捗線と同じ挙動。span 外のタスクが誤って左右へ張り出すのを防ぐ）
 *
 * @param task 対象タスク
 * @param todayMs 基準日の epoch ミリ秒
 * @param todayX 基準日の X 座標（= dateToX(today)）
 * @param dateToX 日付→X座標の変換（タイムライン基準・日付に線形）
 * @returns 進捗点X。マイルストーン／ゼロ期間タスクは進捗点を定義できず null。
 */
export function progressPointX(
  task: ProgressLineTask,
  todayMs: number,
  todayX: number,
  dateToX: (date: Date) => number,
): number | null {
  if (task.isMilestone) return null;

  const startMs = task.startDate.getTime();
  const endMs = task.endDate.getTime();
  // ゼロ／負の期間は進捗を日付位置に写像できないため対象外
  if (endMs <= startMs) return null;

  const ratio = Math.max(0, Math.min(100, task.progress)) / 100;
  // 実績進捗に対応する日付（バー上で進捗率に相当する位置）
  const achievedMs = startMs + (endMs - startMs) * ratio;
  // 基準日をタスク期間にクランプ（未着手／完了済みタスクを基準線上に乗せる）
  const referenceMs = Math.min(Math.max(todayMs, startMs), endMs);

  const deviation =
    dateToX(new Date(achievedMs)) - dateToX(new Date(referenceMs));
  return todayX + deviation;
}

/**
 * イナズマ線の折れ線頂点列を組み立てる。
 *
 * 先頭は (todayX, topY)、各タスク行の進捗点を上から順に通り、末尾は (todayX, bottomY)。
 * マイルストーン／ゼロ期間タスクは進捗点を持たないためスキップする（行はまたぐ）。
 */
export function buildProgressLinePoints(
  rows: ProgressLineRow[],
  todayMs: number,
  todayX: number,
  dateToX: (date: Date) => number,
  topY: number,
  bottomY: number,
): ProgressLinePoint[] {
  const points: ProgressLinePoint[] = [{ x: todayX, y: topY }];
  for (const row of rows) {
    const x = progressPointX(row.task, todayMs, todayX, dateToX);
    if (x === null) continue;
    points.push({ x, y: row.centerY });
  }
  points.push({ x: todayX, y: bottomY });
  return points;
}
