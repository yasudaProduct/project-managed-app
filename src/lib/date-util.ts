type SupportedDateFormat =
    'YYYY/MM/DD' |
    'YYYY年M月D日(曜)' |
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

// 実装
export function formatDate(value: Date, format: SupportedDateFormat): string {
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

        case 'M/D(曜)':
            return date.toLocaleDateString('ja-JP', {
                month: 'numeric',
                day: 'numeric',
                weekday: 'short'
            });

        case 'YYYY/MM/DD HH:mm:ss':
            return date.toLocaleDateString('ja-JP', {
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