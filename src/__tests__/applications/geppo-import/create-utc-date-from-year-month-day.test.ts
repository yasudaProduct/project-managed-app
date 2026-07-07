import { createUtcDateFromYearMonthDay } from '@/applications/geppo-import/geppo-import-application-service'

/**
 * Geppoインポートの実績日（WorkRecord.date）生成のTZ安全性を検証する。
 *
 * WorkRecord.date は `@db.Date` に UTC の暦日として保存されるため、
 * 生成した Date は実行環境のTZに依らず UTC 0時でなければならない。
 * （旧実装 `new Date(year, month, day)` は JST 等で前日ずれを起こしていた。
 *  Issue #48: ガント上の実績日が1日ずれる）
 */
describe('createUtcDateFromYearMonthDay', () => {
  it('YYYYMM＋日を UTC 0時の Date として生成する', () => {
    const d = createUtcDateFromYearMonthDay('202509', 3)
    // TZに依存しない絶対値で検証する
    expect(d.toISOString()).toBe('2025-09-03T00:00:00.000Z')
  })

  it('月初・月末でもUTC暦日が保たれる', () => {
    expect(createUtcDateFromYearMonthDay('202501', 1).toISOString()).toBe(
      '2025-01-01T00:00:00.000Z',
    )
    expect(createUtcDateFromYearMonthDay('202512', 31).toISOString()).toBe(
      '2025-12-31T00:00:00.000Z',
    )
  })

  it('UTCの暦日成分が入力値と一致する（ローカルTZの影響を受けない）', () => {
    const d = createUtcDateFromYearMonthDay('202509', 3)
    expect(d.getUTCFullYear()).toBe(2025)
    expect(d.getUTCMonth()).toBe(8) // 0ベース: 9月
    expect(d.getUTCDate()).toBe(3)
  })
})
