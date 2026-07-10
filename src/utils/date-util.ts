import * as holiday_jp from '@holiday-jp/holiday_jp';
import { format as formatWithDateFns } from 'date-fns';

type SupportedDateFormat =
    'YYYY/MM/DD' |
    'YYYY/MM/DD(曜)' |
    'YYYY年M月D日(曜)' |
    'YYYY年MM月DD日' |
    'M/D(曜)' |
    'YYYY/MM/DD HH:mm:ss';

type InputDateLike = Date | string | number;

function toDate(value: InputDateLike): Date {
    if (value instanceof Date) return value;
    const date = new Date(value)
    if (isNaN(date.getTime())) throw new Error(`Invalid date: ${value}`)
    return date
}

/**
 * 日付を YYYY/MM/DD 形式の文字列に変換します
 * @param date 変換対象の日付
 * @param format YYYY/MM/DD
 * @returns {string} 例: 2025/09/01
 */
export function formatDate(date: Date, format: 'YYYY/MM/DD'): string;

/**
 * 日付を YYYY年M月D日(曜) 形式の文字列に変換します
 * @param date 変換対象の日付
 * @param format YYYY年M月D日(曜)
 * @returns {string} 例: 2025年9月1日(月)
 */
export function formatDate(date: Date, format: 'YYYY年M月D日(曜)'): string;

/**
 * 日付を M/D 形式の文字列に変換します
 * @param date 変換対象の日付
 * @param format M/D(曜)
 * @returns {string} 例: 9/1(月)
 */
export function formatDate(date: Date, format: 'M/D(曜)'): string;

/**
 * 日時を YYYY/MM/DD HH:mm:ss 形式の文字列に変換します
 * @param date 変換対象の日時
 * @param format YYYY/MM/DD HH:mm:ss
 * @returns {string} 例: 2025/09/01 08:05:45
 */
export function formatDate(date: Date, format: 'YYYY/MM/DD HH:mm:ss'): string;

/**
 * 日付を YYYY/MM/DD(曜) 形式の文字列に変換します
 * @param date 変換対象の日付
 * @param format YYYY/MM/DD(曜)
 * @returns {string} 例: 2025/09/01(月)
 */
export function formatDate(date: Date, format: 'YYYY/MM/DD(曜)'): string;

/**
 * 日付を YYYY年MM月DD日 形式（0埋め）の文字列に変換します
 * @param date 変換対象の日付
 * @param format YYYY年MM月DD日
 * @returns {string} 例: 2025年09月01日
 */
export function formatDate(date: Date, format: 'YYYY年MM月DD日'): string;

// 実装
export function formatDate(value: Date, format: SupportedDateFormat): string {
    if (!value) return ""
    const date = toDate(value)
    switch (format) {
        case 'YYYY/MM/DD':
            return date.toLocaleDateString('ja-JP', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit'
            });

        case 'YYYY年M月D日(曜)':
            return date.toLocaleDateString('ja-JP', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                weekday: 'short'
            });

        case 'YYYY/MM/DD(曜)':
            return date.toLocaleDateString('ja-JP', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                weekday: 'short'
            });

        case 'YYYY年MM月DD日':
            return formatWithDateFns(date, 'yyyy年MM月dd日');

        case 'M/D(曜)':
            return date.toLocaleDateString('ja-JP', {
                month: 'numeric',
                day: 'numeric',
                weekday: 'short'
            });

        case 'YYYY/MM/DD HH:mm:ss':
            // 日付＋時刻を出力するため toLocaleString を用いる。
            // （toLocaleDateString は「日付」用メソッドで、明示 time オプションが将来
            //   不要と誤解され削除されると時刻が欠落する罠になるため、意味の合う API に統一）
            return date.toLocaleString('ja-JP', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
            });

        default:
            throw new Error(`Unsupported format: ${format}`);
    }
}

/**
 * 土日・祝日かどうかを判定
 * @param date 判定対象の日付
 * @returns 土日・祝日かどうか
 */
export const isHoliday = (date: Date): boolean => {
    return holiday_jp.isHoliday(date) || date.getDay() === 0 || date.getDay() === 6;
}

interface Holiday {
    date: Date;
    name: string;
}

/**
 * 祝日リストを取得
 * @param year 年
 * @returns 祝日リスト
 */
export const getHolidays = (year: number): Holiday[] => {
    return holiday_jp.between(new Date(year, 0, 1), new Date(year, 0, 1));
}
// ---------------------------------------------------------------------------
// UTC日付ヘルパー（EVM・インポート系で使用。サーバーTZに依存しない日付境界処理）
// ---------------------------------------------------------------------------

/**
 * UTC暦日のキー（YYYY-MM-DD）を返す。
 * 作業実績の日付キー・累積AC集計などUTC基準の突き合わせに使用する。
 */
export const utcDateKey = (date: Date): string => {
    return date.toISOString().slice(0, 10);
}

/**
 * UTCでの「翌日0時」のエポックmsを返す。
 * as-ofスナップショット解決など「評価日の終了時刻」境界に使用する。
 */
export const utcNextDayStartMs = (date: Date): number => {
    return Date.UTC(
        date.getUTCFullYear(),
        date.getUTCMonth(),
        date.getUTCDate() + 1
    );
}

/**
 * 年・月（1〜12）・日からUTC深夜0時のDateを生成する。
 * `new Date(y, m, d)`（ローカルTZ解釈）の置き換え用。
 */
export const utcDateFromYmd = (year: number, month1to12: number, day: number): Date => {
    return new Date(Date.UTC(year, month1to12 - 1, day));
}

/**
 * UTC基準で月を加算する。加算先の月に同日が存在しない場合は月末にクランプする。
 * 常に基準日から計算するため、累積setMonthのようなドリフト（1/31→3/3）が起きない。
 * 時刻成分は維持する。
 */
export const addUtcMonthsClamped = (date: Date, months: number): Date => {
    const year = date.getUTCFullYear();
    const month = date.getUTCMonth() + months;
    // Date.UTC(y, m+1, 0) は対象月の月末日
    const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
    const day = Math.min(date.getUTCDate(), lastDay);
    return new Date(
        Date.UTC(
            year,
            month,
            day,
            date.getUTCHours(),
            date.getUTCMinutes(),
            date.getUTCSeconds(),
            date.getUTCMilliseconds()
        )
    );
}
