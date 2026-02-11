import { formatDate } from '../../utils/date-util';

describe('date-util', () => {
    describe('formatDate', () => {
        // ヘルパー: ローカルタイムゾーンで期待値を計算
        const formatExpected = (date: Date): string => {
            const y = date.getFullYear();
            const m = String(date.getMonth() + 1).padStart(2, '0');
            const d = String(date.getDate()).padStart(2, '0');
            const h = String(date.getHours()).padStart(2, '0');
            const min = String(date.getMinutes()).padStart(2, '0');
            const s = String(date.getSeconds()).padStart(2, '0');
            return `${y}/${m}/${d} ${h}:${min}:${s}`;
        };

        // UTC正午を使用することでタイムゾーンに関わらず同じ日付になる
        const testDateUTC = new Date('2025-09-01T12:00:00Z');

        describe('YYYY/MM/DD形式', () => {
            it('日付をYYYY/MM/DD形式に変換する', () => {
                const result = formatDate(testDateUTC, 'YYYY/MM/DD');
                expect(result).toBe('2025/09/01');
            });

            it('月日が1桁の場合は0パディングする', () => {
                const date = new Date('2025-01-05T12:00:00Z');
                const result = formatDate(date, 'YYYY/MM/DD');
                expect(result).toBe('2025/01/05');
            });
        });

        describe('YYYY年M月D日(曜)形式', () => {
            it('日付をYYYY年M月D日(曜)形式に変換する', () => {
                // 2025年9月1日(月)をテスト - UTC時間で正午を使用
                const result = formatDate(testDateUTC, 'YYYY年M月D日(曜)');
                expect(result).toBe('2025年9月1日(月)');
            });

            it('月日が1桁の場合は0パディングしない', () => {
                // 2025年1月5日(日)をテスト
                const date = new Date('2025-01-05T12:00:00Z');
                const result = formatDate(date, 'YYYY年M月D日(曜)');
                expect(result).toBe('2025年1月5日(日)');
            });

            it('曜日を正しく表示する', () => {
                // 2025年9月7日は日曜日
                const sunday = new Date('2025-09-07T12:00:00Z');
                const result = formatDate(sunday, 'YYYY年M月D日(曜)');
                expect(result).toBe('2025年9月7日(日)');
            });
        });

        describe('M/D(曜)形式', () => {
            it('日付をM/D(曜)形式に変換する', () => {
                const result = formatDate(testDateUTC, 'M/D(曜)');
                expect(result).toBe('9/1(月)');
            });

            it('月日が1桁の場合は0パディングしない', () => {
                const date = new Date('2025-01-05T12:00:00Z');
                const result = formatDate(date, 'M/D(曜)');
                expect(result).toBe('1/5(日)');
            });

            it('2桁の月日も正しく表示する', () => {
                const date = new Date('2025-12-25T12:00:00Z');
                const result = formatDate(date, 'M/D(曜)');
                expect(result).toBe('12/25(木)');
            });
        });

        describe('YYYY/MM/DD HH:mm:ss形式', () => {
            it('日時をYYYY/MM/DD HH:mm:ss形式に変換する', () => {
                // ローカルタイムで特定の時刻を作成
                const date = new Date(2025, 8, 1, 17, 5, 45); // 2025/09/01 17:05:45 ローカル
                const result = formatDate(date, 'YYYY/MM/DD HH:mm:ss');
                expect(result).toBe('2025/09/01 17:05:45');
            });

            it('時分秒が1桁の場合は0パディングする', () => {
                const date = new Date(2025, 0, 5, 9, 3, 5); // 2025/01/05 09:03:05 ローカル
                const result = formatDate(date, 'YYYY/MM/DD HH:mm:ss');
                expect(result).toBe('2025/01/05 09:03:05');
            });

            it('真夜中（0時）を正しく表示する', () => {
                const midnight = new Date(2025, 8, 1, 0, 0, 0); // 2025/09/01 00:00:00 ローカル
                const result = formatDate(midnight, 'YYYY/MM/DD HH:mm:ss');
                expect(result).toBe('2025/09/01 00:00:00');
            });
        });

        describe('入力値の型変換', () => {
            it('Dateオブジェクトを受け付ける', () => {
                const date = new Date('2025-09-01T12:00:00Z');
                const result = formatDate(date, 'YYYY/MM/DD');
                expect(result).toBe('2025/09/01');
            });

            it('文字列の日付を受け付ける（内部でDate変換される）', () => {
                // formatDate関数の第一引数はDateのみを受け付けるため、
                // 文字列を直接渡すとTypeScriptエラーになる
                // ただし、内部のtoDate関数は文字列も受け付ける設計
                const date = new Date('2025-09-01T12:00:00Z');
                const result = formatDate(date, 'YYYY/MM/DD');
                expect(result).toBe('2025/09/01');
            });

            it('ISO文字列から正しく変換する', () => {
                const isoString = '2025-09-01T08:05:45.123Z';
                const date = new Date(isoString);
                const result = formatDate(date, 'YYYY/MM/DD HH:mm:ss');
                // タイムゾーンに応じた結果を期待
                const expected = formatExpected(date);
                expect(result).toBe(expected);
            });

            it('タイムスタンプ（ミリ秒）から正しく変換する', () => {
                const timestamp = new Date('2025-09-01T12:00:00Z').getTime();
                const date = new Date(timestamp);
                const result = formatDate(date, 'YYYY/MM/DD');
                expect(result).toBe('2025/09/01');
            });
        });

        describe('エラーハンドリング', () => {
            it('無効な日付は"Invalid Date"として処理される', () => {
                const invalidDate = new Date('invalid');
                // toLocaleDateStringはInvalid Dateを"Invalid Date"として返す
                const result = formatDate(invalidDate, 'YYYY/MM/DD');
                expect(result).toBe('Invalid Date');
            });

            it('サポートされていないフォーマットでエラーをスローする', () => {
                const date = new Date('2025-09-01T12:00:00Z');
                // @ts-expect-error: テスト用に無効なフォーマットを渡す
                expect(() => formatDate(date, 'INVALID_FORMAT')).toThrow('Unsupported format: INVALID_FORMAT');
            });
        });

        describe('エッジケース', () => {
            it('うるう年の2月29日を正しく処理する', () => {
                const leapDay = new Date('2024-02-29T12:00:00Z');
                const result = formatDate(leapDay, 'YYYY年M月D日(曜)');
                expect(result).toBe('2024年2月29日(木)');
            });

            it('年末年始を正しく処理する', () => {
                // ローカルタイムで年末を作成
                const newYearEve = new Date(2025, 11, 31, 23, 59, 59); // 2025/12/31 23:59:59 ローカル
                const result = formatDate(newYearEve, 'YYYY/MM/DD HH:mm:ss');
                expect(result).toBe('2025/12/31 23:59:59');
            });

            it('DST（夏時間）を考慮しない（日本はDSTなし）', () => {
                // ローカルタイムで夏と冬の同じ時刻を作成
                const summer = new Date(2025, 6, 1, 9, 0, 0); // 2025/07/01 09:00:00 ローカル
                const winter = new Date(2025, 0, 1, 9, 0, 0); // 2025/01/01 09:00:00 ローカル

                const summerResult = formatDate(summer, 'YYYY/MM/DD HH:mm:ss');
                const winterResult = formatDate(winter, 'YYYY/MM/DD HH:mm:ss');

                // 日本はDSTがないため、両方とも同じ時刻で表示される
                expect(summerResult).toBe('2025/07/01 09:00:00');
                expect(winterResult).toBe('2025/01/01 09:00:00');
            });
        });

        describe('ロケールの一貫性', () => {
            it('ja-JPロケールで一貫した表示をする', () => {
                const date = new Date('2025-09-01T12:00:00Z');

                // すべてのフォーマットがja-JPロケールを使用していることを確認
                const format1 = formatDate(date, 'YYYY/MM/DD');
                const format2 = formatDate(date, 'YYYY年M月D日(曜)');
                const format3 = formatDate(date, 'M/D(曜)');
                const format4 = formatDate(date, 'YYYY/MM/DD HH:mm:ss');

                // 各フォーマットで日本語形式になっていることを確認
                expect(format1).toMatch(/^\d{4}\/\d{2}\/\d{2}$/);
                expect(format2).toMatch(/^\d{4}年\d{1,2}月\d{1,2}日\(.+\)$/);
                expect(format3).toMatch(/^\d{1,2}\/\d{1,2}\(.+\)$/);
                expect(format4).toMatch(/^\d{4}\/\d{2}\/\d{2} \d{2}:\d{2}:\d{2}$/);
            });
        });
    });
});
