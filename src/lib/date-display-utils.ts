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

export function formatUTCDateForDisplay(date: Date | string | number | undefined | null): string {
  const d = toValidDate(date);
  if (!d) return "";
  // UTC日付の年月日を取得
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
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

/**
 * DatePicker用：UTC日付をローカル日付として解釈
 * input[type="date"]は "YYYY-MM-DD" 形式を期待する
 */
export function formatUTCDateForDatePicker(date: Date | string | number | undefined | null): string {
  return formatUTCDateForDisplay(date);
}

/**
 * 日本語表示用：UTC日付を「YYYY年MM月DD日」形式で表示
 */
export function formatUTCDateForJapanese(date: Date | string | number | undefined | null): string {
  const d = toValidDate(date);
  if (!d) return "";
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${year}年${month}月${day}日`;
}

/**
 * 相対日付表示（今日、明日、N日後など）
 * UTC日付をローカル日付として解釈して比較
 */
export function formatUTCDateRelative(date: Date | string | number | undefined | null): string {
  const d = toValidDate(date);
  if (!d) return "";
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const targetDate = utcToLocalDate(d);
  if (!targetDate) return "";

  const diffTime = targetDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "今日";
  if (diffDays === 1) return "明日";
  if (diffDays === -1) return "昨日";
  if (diffDays > 0) return `${diffDays}日後`;
  return `${Math.abs(diffDays)}日前`;
}

/**
 * デバッグ用：UTC日付とローカル表示の両方を表示
 */
export function debugDateDisplay(date: Date | undefined | null): string {
  if (!date) return "No date";

  return `UTC: ${date.toISOString()} → Local Display: ${formatUTCDateForDisplay(date)}`;
}