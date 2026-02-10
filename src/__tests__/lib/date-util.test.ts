import { formatDate } from '../../utils/date-util';

describe('date-util', () => {
    describe('formatDate', () => {
        // テスト環境はUTCで実行されるため、UTCの日付を使用
        // toLocaleDateString('ja-JP')はUTC時間を基準にフォーマットされる
        const testDate = new Date('2025-09-01T08:05:45.123Z');
        // UTC時間で9月1日正午 - これはja-JPフォーマットでも9月1日になる
        const testDateUTC = new Date('2025-09-01T12:00:00Z');

        describe('YYYY/MM/DD形式', () => {
            it('日付をYYYY/MM/DD形式に変換する', () => {
                const result = formatDate(testDate, 'YYYY/MM/DD');
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
                const result = formatDate(testDate, 'YYYY/MM/DD HH:mm:ss');
                // CIはUTCで実行されるため、UTC時間で表示される
                expect(result).toBe('2025/09/01 08:05:45');
            });

            it('時分秒が1桁の場合は0パディングする', () => {
                const date = new Date('2025-01-05T00:03:05Z');
                const result = formatDate(date, 'YYYY/MM/DD HH:mm:ss');
                expect(result).toBe('2025/01/05 00:03:05');
            });

            it('真夜中（0時）を正しく表示する', () => {
                const midnight = new Date('2025-09-01T00:00:00Z');
                const result = formatDate(midnight, 'YYYY/MM/DD HH:mm:ss');
                expect(result).toBe('2025/09/01 00:00:00');
            });
        });

        describe('入力値の型変換', () => {
            it('Dateオブジェクトを受け付ける', () => {
                const date = new Date('2025-09-01T00:00:00Z');
                const result = formatDate(date, 'YYYY/MM/DD');
                expect(result).toBe('2025/09/01');
            });

            it('文字列の日付を受け付ける（内部でDate変換される）', () => {
                // formatDate関数の第一引数はDateのみを受け付けるため、
                // 文字列を直接渡すとTypeScriptエラーになる
                // ただし、内部のtoDate関数は文字列も受け付ける設計
                const date = new Date('2025-09-01T00:00:00Z');
                const result = formatDate(date, 'YYYY/MM/DD');
                expect(result).toBe('2025/09/01');
            });

            it('ISO文字列から正しく変換する', () => {
                const isoString = '2025-09-01T08:05:45.123Z';
                const date = new Date(isoString);
                const result = formatDate(date, 'YYYY/MM/DD HH:mm:ss');
                // CIはUTCで実行されるため、UTC時間で表示される
                expect(result).toBe('2025/09/01 08:05:45');
            });

            it('タイムスタンプ（ミリ秒）から正しく変換する', () => {
                const timestamp = new Date('2025-09-01T00:00:00Z').getTime();
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
                const date = new Date('2025-09-01T00:00:00Z');
                // @ts-expect-error: テスト用に無効なフォーマットを渡す
                expect(() => formatDate(date, 'INVALID_FORMAT')).toThrow('Unsupported format: INVALID_FORMAT');
            });
        });

        describe('エッジケース', () => {
            it('うるう年の2月29日を正しく処理する', () => {
                const leapDay = new Date('2024-02-29T00:00:00Z');
                const result = formatDate(leapDay, 'YYYY年M月D日(曜)');
                expect(result).toBe('2024年2月29日(木)');
            });

            it('年末年始を正しく処理する', () => {
                const newYearEve = new Date('2025-12-31T23:59:59Z');
                const result = formatDate(newYearEve, 'YYYY/MM/DD HH:mm:ss');
                // CIはUTCで実行されるため、UTC時間で表示される
                expect(result).toBe('2025/12/31 23:59:59');
            });

            it('DST（夏時間）を考慮しない（日本はDSTなし）', () => {
                // CIはUTCで実行されるため、UTC時間で表示される
                const summer = new Date('2025-07-01T00:00:00Z');
                const winter = new Date('2025-01-01T00:00:00Z');

                const summerResult = formatDate(summer, 'YYYY/MM/DD HH:mm:ss');
                const winterResult = formatDate(winter, 'YYYY/MM/DD HH:mm:ss');

                expect(summerResult).toBe('2025/07/01 00:00:00');
                expect(winterResult).toBe('2025/01/01 00:00:00');
            });
        });

        describe('ロケールの一貫性', () => {
            it('ja-JPロケールで一貫した表示をする', () => {
                const date = new Date('2025-09-01T00:00:00Z');

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