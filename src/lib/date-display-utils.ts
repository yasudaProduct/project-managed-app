/**
 * クライアント側の日付表示ユーティリティ
 * 原則：サーバーから受け取ったUTC日付をローカルタイムゾーンで表示する
 */

/**
 * UTC日付をローカル日付として解釈し、YYYY-MM-DD形式で表示
 * データベースから取得したUTC日付を、同じ日付のローカル時刻として表示する
 * 例: UTC 2024-01-15T00:00:00.000Z → "2024-01-15"（タイムゾーンに関係なく）
 */
function toValidDate(value: Date | string | number | undefined | null): Date | undefined {
  if (!value) return undefined;
  if (value instanceof Date) {
    return isNaN(value.getTime()) ? undefined : value;
  }
  if (typeof value === 'string' || typeof value === 'number') {
    const parsed = new Date(value);
    return isNaN(parsed.getTime()) ? undefined : parsed;
  }
  return undefined;
}

/**
 * UTC日付をローカル日付として解釈し、YYYY/MM/DD形式で表示
 */
export function formatUTCDateForDisplaySlash(date: Date | string | number | undefined | null): string {
  const d = toValidDate(date);
  if (!d) return "";
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${year}/${month}/${day}`;
}

/**
 * UTC日付をローカルDateオブジェクトとして作成
 * ガントチャートなどの計算で使用
 * 例: UTC 2024-01-15T00:00:00.000Z → ローカル 2024-01-15 00:00:00
 */
export function utcToLocalDate(utcDate: Date | string | number | undefined | null): Date | undefined {
  const d = toValidDate(utcDate);
  if (!d) return undefined;
  return new Date(
    d.getUTCFullYear(),
    d.getUTCMonth(),
    d.getUTCDate(),
    0, 0, 0, 0
  );
}
