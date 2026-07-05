/**
 * Server Action の戻り値を統一する共通型。
 * 成功時は `data` を、失敗時は `error`（ユーザー向け日本語メッセージ）を返す。
 * エラーメッセージのキーは `error` に統一し、`message` は使わない（docs/03, docs/04 参照）。
 */
export type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string };
