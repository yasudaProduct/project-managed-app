/** 例外オブジェクトから表示用のメッセージ文字列を取り出す。 */
export function toErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "不明なエラー";
}
