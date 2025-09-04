/**
 * サーバー側の日付処理ユーティリティ
 * 原則：サーバー側はすべてUTCで保存・処理する
 */

/**
 * ローカル日付（YYYY-MM-DD形式など）をUTCの開始時刻（00:00:00）に変換
 * 例: "2024-01-15" → 2024-01-15T00:00:00.000Z
 */
export function localDateStringToUTC(dateString: string): Date {
  // YYYY-MM-DD or YYYY/MM/DD 形式を想定
  const normalized = dateString.replace(/\//g, '-');
  // UTCとして解釈されるように、時刻を明示的に指定
  return new Date(`${normalized}T00:00:00.000Z`);
}

/**
 * ローカルDateオブジェクトをUTCの日付開始時刻に変換
 * 例: 2024-01-15 15:30:00 JST → 2024-01-15T00:00:00.000Z
 */
export function localDateToUTCStartOfDay(date: Date): Date {
  const year = date.getFullYear();
  const month = date.getMonth();
  const day = date.getDate();
  return new Date(Date.UTC(year, month, day, 0, 0, 0, 0));
}

/**
 * ローカルDateオブジェクトをUTCの日付終了時刻に変換
 * 例: 2024-01-15 15:30:00 JST → 2024-01-15T23:59:59.999Z
 */
export function localDateToUTCEndOfDay(date: Date): Date {
  const year = date.getFullYear();
  const month = date.getMonth();
  const day = date.getDate();
  return new Date(Date.UTC(year, month, day, 23, 59, 59, 999));
}

/**
 * DateオブジェクトがUTCかローカルかを判別するヘルパー
 * （デバッグ用）
 */
export function isUTCMidnight(date: Date): boolean {
  return date.getUTCHours() === 0 && 
         date.getUTCMinutes() === 0 && 
         date.getUTCSeconds() === 0 &&
         date.getUTCMilliseconds() === 0;
}

/**
 * UTC日付を維持したまま新しいDateオブジェクトを作成
 * Prismaなどに渡す際に使用
 */
export function ensureUTC(date: Date | string | undefined): Date | undefined {
  if (!date) return undefined;
  
  if (typeof date === 'string') {
    return localDateStringToUTC(date);
  }
  
  // すでにUTCの00:00:00の場合はそのまま返す
  if (isUTCMidnight(date)) {
    return new Date(date);
  }
  
  // そうでない場合は、ローカル日付として解釈してUTCに変換
  return localDateToUTCStartOfDay(date);
}

/**
 * データベースから取得したUTC日付をそのまま返す
 * （クライアント側で必要に応じて変換する）
 */
export function fromDatabase(date: Date | null): Date | undefined {
  return date || undefined;
}