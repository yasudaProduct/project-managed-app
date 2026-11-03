import { calendarDateInTimeZone, startOfDayInTimeZone } from '@/utils/date-util';

/**
 * 指定タイムゾーンでの暦日（UTC深夜0時のDate）。
 * サーバーはUTCで動くため、JSTの朝（UTCでは前日）に「今日」を取り違えないようにする。
 */
describe('calendarDateInTimeZone', () => {
  it('JSTの朝8時（UTCでは前日23時）はJSTの当日になる', () => {
    expect(
      calendarDateInTimeZone(new Date('2026-10-30T23:00:00.000Z'), 'Asia/Tokyo').toISOString()
    ).toBe('2026-10-31T00:00:00.000Z');
  });

  it('JSTの深夜0時直前はJSTの当日のまま', () => {
    expect(
      calendarDateInTimeZone(new Date('2026-10-31T14:59:59.000Z'), 'Asia/Tokyo').toISOString()
    ).toBe('2026-10-31T00:00:00.000Z');
  });

  it('タイムゾーン省略時はAsia/Tokyo', () => {
    expect(calendarDateInTimeZone(new Date('2026-12-31T15:00:00.000Z')).toISOString()).toBe(
      '2027-01-01T00:00:00.000Z'
    );
  });
});

describe('startOfDayInTimeZone', () => {
  it('JSTの当日0時（UTCでは前日15時）を返す', () => {
    expect(
      startOfDayInTimeZone(new Date('2026-10-31T03:00:00.000Z'), 'Asia/Tokyo').toISOString()
    ).toBe('2026-10-30T15:00:00.000Z');
  });

  it('JSTの朝8時（UTCでは前日23時）でもJSTの当日0時を返す', () => {
    expect(
      startOfDayInTimeZone(new Date('2026-10-30T23:00:00.000Z'), 'Asia/Tokyo').toISOString()
    ).toBe('2026-10-30T15:00:00.000Z');
  });

  it('UTCを指定するとUTCの当日0時', () => {
    expect(
      startOfDayInTimeZone(new Date('2026-10-31T03:00:00.000Z'), 'UTC').toISOString()
    ).toBe('2026-10-31T00:00:00.000Z');
  });
});
