/**
 * タスク名の部分一致で「実施日固定タスク」かどうかを判定する。
 * 実施日固定タスク = 本番導入・定例会など実施日が確定しており、
 * 前詰めせず入力済みの予定期間（YOTEI）をそのまま採用するタスク。
 *
 * @param taskName 判定対象のタスク名
 * @param keywords project_settings に設定された実施日固定タスク判定キーワード
 * @returns いずれかのキーワードがタスク名に部分一致すれば true。キーワードが空なら常に false
 */
export function isFixedDateTask(taskName: string, keywords: string[]): boolean {
  if (!taskName || !keywords || keywords.length === 0) {
    return false;
  }
  return keywords.some((kw) => kw.length > 0 && taskName.includes(kw));
}
