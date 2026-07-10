export type WbsSyncMode = 'diff' | 'replace';

/**
 * ジョブのoptionsからWBS同期モードを解決する。
 * 既定は 'diff'（差分同期）。'replace' を明示した場合のみ洗い替え。不正値も 'diff'。
 */
export function resolveWbsSyncMode(
  options: Record<string, unknown> | undefined
): WbsSyncMode {
  return options?.syncMode === 'replace' ? 'replace' : 'diff';
}
