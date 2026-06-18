/**
 * タスク名の部分一致で「定常タスク」かどうかを判定する。
 * 定常タスク = プロジェクト管理など、期間中ずっと一定工数を消費し前詰めしないタスク。
 *
 * @param taskName 判定対象のタスク名
 * @param keywords project_settings に設定された定常タスク判定キーワード
 * @returns いずれかのキーワードがタスク名に部分一致すれば true。キーワードが空なら常に false
 */
export function isSteadyTask(taskName: string, keywords: string[]): boolean {
  if (!taskName || !keywords || keywords.length === 0) {
    return false;
  }
  return keywords.some((kw) => kw.length > 0 && taskName.includes(kw));
}
