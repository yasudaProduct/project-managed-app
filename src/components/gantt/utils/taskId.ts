/**
 * gantt の Task.id は表示・依存参照用の一意な文字列ハンドルで、
 * タスクは `task-<dbId>`、マイルストーンは `ms-<dbId>` の接頭辞を持つ
 * （別テーブルの数値ID同士の衝突を避けるため）。
 *
 * サーバー操作に渡す数値IDが必要な場面では原則 `Task.dbId` を使うが、
 * 依存関係のように文字列IDしか持たない値から数値へ戻す場合にこの関数を使う。
 * 接頭辞の有無どちらも受け付ける（後方互換）。
 */
export function parseDbId(stringId: string): number {
  const withoutPrefix = stringId.replace(/^(task-|ms-)/, "");
  return Number(withoutPrefix);
}
