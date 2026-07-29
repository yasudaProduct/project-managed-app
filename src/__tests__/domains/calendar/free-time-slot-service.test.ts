import { CompanyCalendar, CompanyHoliday } from '@/domains/calendar/company-calendar';
import {
  FreeTimeSlotService,
  FREE_TIME_WINDOW_START_MINUTES,
  FREE_TIME_WINDOW_END_MINUTES,
} from '@/domains/calendar/free-time-slot-service';
import type { UserSchedule } from '@/domains/calendar/assignee-working-calendar';

describe('FreeTimeSlotService', () => {
  // 2026-05-25(月) / 2026-05-23(土) / 2026-05-24(日) / 2026-01-01(元日・木) は
  // company-calendar.test.ts で曜日・祝日検証済みの日付を再利用
  const monday = new Date('2026-05-25');
  const tuesday = new Date('2026-05-26');
  const wednesday = new Date('2026-05-27');

  let scheduleId = 0;
  const makeSchedule = (
    userId: string,
    dateIso: string,
    startTime: string,
    endTime: string,
    title = '会議'
  ): UserSchedule => ({
    id: ++scheduleId,
    userId,
    date: new Date(dateIso),
    startTime,
    endTime,
    title,
  });

  const makeService = (holidays: CompanyHoliday[] = []) =>
    new FreeTimeSlotService(new CompanyCalendar(8, holidays));

  describe('listCommonFreeSlots', () => {
    it('時間帯定数が09:00〜18:00であること', () => {
      expect(FREE_TIME_WINDOW_START_MINUTES).toBe(9 * 60);
      expect(FREE_TIME_WINDOW_END_MINUTES).toBe(18 * 60);
    });

    it('平日・予定なしの場合、窓全体(09:00〜18:00)が1スロットで返ること', () => {
      const result = makeService().listCommonFreeSlots({
        userIds: ['u1'],
        schedules: [],
        startDate: monday,
        endDate: monday,
      });

      expect(result).toEqual([
        {
          date: monday,
          slots: [{ startMinutes: 540, endMinutes: 1080 }],
        },
      ]);
    });

    it('1ユーザーの予定(10:00〜12:00)で空きが2つに分割されること', () => {
      const result = makeService().listCommonFreeSlots({
        userIds: ['u1'],
        schedules: [makeSchedule('u1', '2026-05-25', '10:00', '12:00')],
        startDate: monday,
        endDate: monday,
      });

      expect(result).toEqual([
        {
          date: monday,
          slots: [
            { startMinutes: 540, endMinutes: 600 },
            { startMinutes: 720, endMinutes: 1080 },
          ],
        },
      ]);
    });

    it('複数ユーザーの予定を合成し、全員が空いている時間帯のみ返ること', () => {
      // u1: 09:00-11:00, u2: 10:00-13:00, u3: 15:00-16:00
      // → 全員空きは 13:00-15:00 と 16:00-18:00
      const result = makeService().listCommonFreeSlots({
        userIds: ['u1', 'u2', 'u3'],
        schedules: [
          makeSchedule('u1', '2026-05-25', '09:00', '11:00'),
          makeSchedule('u2', '2026-05-25', '10:00', '13:00'),
          makeSchedule('u3', '2026-05-25', '15:00', '16:00'),
        ],
        startDate: monday,
        endDate: monday,
      });

      expect(result).toEqual([
        {
          date: monday,
          slots: [
            { startMinutes: 780, endMinutes: 900 },
            { startMinutes: 960, endMinutes: 1080 },
          ],
        },
      ]);
    });

    it('隣接・重複する予定がマージされ、0分の空きスロットが発生しないこと', () => {
      // 隣接: u1 10:00-12:00 + u2 12:00-14:00 → busy 10:00-14:00
      const adjacent = makeService().listCommonFreeSlots({
        userIds: ['u1', 'u2'],
        schedules: [
          makeSchedule('u1', '2026-05-25', '10:00', '12:00'),
          makeSchedule('u2', '2026-05-25', '12:00', '14:00'),
        ],
        startDate: monday,
        endDate: monday,
      });

      expect(adjacent).toEqual([
        {
          date: monday,
          slots: [
            { startMinutes: 540, endMinutes: 600 },
            { startMinutes: 840, endMinutes: 1080 },
          ],
        },
      ]);

      // 重複: u1 10:00-13:00 + u2 11:00-14:00 → busy 10:00-14:00
      const overlapping = makeService().listCommonFreeSlots({
        userIds: ['u1', 'u2'],
        schedules: [
          makeSchedule('u1', '2026-05-25', '10:00', '13:00'),
          makeSchedule('u2', '2026-05-25', '11:00', '14:00'),
        ],
        startDate: monday,
        endDate: monday,
      });

      expect(overlapping).toEqual([
        {
          date: monday,
          slots: [
            { startMinutes: 540, endMinutes: 600 },
            { startMinutes: 840, endMinutes: 1080 },
          ],
        },
      ]);
    });

    it('全休タイトルの予定は時刻に関係なく終日ブロックし、その日が結果に含まれないこと', () => {
      // 全休エントリは開始・終了時刻が無意味な値でも全日不在扱い
      const result = makeService().listCommonFreeSlots({
        userIds: ['u1', 'u2'],
        schedules: [makeSchedule('u1', '2026-05-25', '00:00', '00:00', '有給')],
        startDate: monday,
        endDate: monday,
      });

      expect(result).toEqual([]);

      const substitute = makeService().listCommonFreeSlots({
        userIds: ['u1'],
        schedules: [makeSchedule('u1', '2026-05-25', '09:00', '09:30', '振休')],
        startDate: monday,
        endDate: monday,
      });

      expect(substitute).toEqual([]);
    });

    it('最低空き時間で指定未満のスロットが除外され、ちょうどの長さは残ること', () => {
      // u1 10:00-16:00 → 空きは 09:00-10:00(60分) と 16:00-18:00(120分)
      const schedules = [makeSchedule('u1', '2026-05-25', '10:00', '16:00')];

      const min90 = makeService().listCommonFreeSlots({
        userIds: ['u1'],
        schedules,
        startDate: monday,
        endDate: monday,
        minDurationMinutes: 90,
      });
      expect(min90).toEqual([
        { date: monday, slots: [{ startMinutes: 960, endMinutes: 1080 }] },
      ]);

      // 境界: ちょうど120分のスロットは minDurationMinutes: 120 で残る
      const min120 = makeService().listCommonFreeSlots({
        userIds: ['u1'],
        schedules,
        startDate: monday,
        endDate: monday,
        minDurationMinutes: 120,
      });
      expect(min120).toEqual([
        { date: monday, slots: [{ startMinutes: 960, endMinutes: 1080 }] },
      ]);

      // 全スロットが未満になった日は結果から除外される
      const min121 = makeService().listCommonFreeSlots({
        userIds: ['u1'],
        schedules,
        startDate: monday,
        endDate: monday,
        minDurationMinutes: 121,
      });
      expect(min121).toEqual([]);
    });

    it('土日がスキップされること', () => {
      // 2026-05-23(土)〜2026-05-25(月) → 月曜のみ
      const result = makeService().listCommonFreeSlots({
        userIds: ['u1'],
        schedules: [],
        startDate: new Date('2026-05-23'),
        endDate: monday,
      });

      expect(result).toEqual([
        { date: monday, slots: [{ startMinutes: 540, endMinutes: 1080 }] },
      ]);
    });

    it('日本の祝日がスキップされること', () => {
      // 2026-01-01(元日・木)〜2026-01-02(金) → 1/2 のみ
      const result = makeService().listCommonFreeSlots({
        userIds: ['u1'],
        schedules: [],
        startDate: new Date('2026-01-01'),
        endDate: new Date('2026-01-02'),
      });

      expect(result).toEqual([
        {
          date: new Date('2026-01-02'),
          slots: [{ startMinutes: 540, endMinutes: 1080 }],
        },
      ]);
    });

    it('会社休日がスキップされること', () => {
      // 2026-05-26(火)を会社休日に設定 → 5/25(月)のみ
      const result = makeService([
        { date: tuesday, name: '創立記念日', type: 'COMPANY' },
      ]).listCommonFreeSlots({
        userIds: ['u1'],
        schedules: [],
        startDate: monday,
        endDate: tuesday,
      });

      expect(result).toEqual([
        { date: monday, slots: [{ startMinutes: 540, endMinutes: 1080 }] },
      ]);
    });

    it('窓(09:00〜18:00)の外の予定は無視され、跨る予定はクランプされること', () => {
      // 完全に窓外(早朝・夜間)の予定 → 窓全体が空き
      const outside = makeService().listCommonFreeSlots({
        userIds: ['u1'],
        schedules: [
          makeSchedule('u1', '2026-05-25', '07:00', '08:30'),
          makeSchedule('u1', '2026-05-25', '18:30', '20:00'),
        ],
        startDate: monday,
        endDate: monday,
      });
      expect(outside).toEqual([
        { date: monday, slots: [{ startMinutes: 540, endMinutes: 1080 }] },
      ]);

      // 窓を跨ぐ予定(08:00-10:00) → 09:00-10:00 のみ busy 扱い
      const crossing = makeService().listCommonFreeSlots({
        userIds: ['u1'],
        schedules: [makeSchedule('u1', '2026-05-25', '08:00', '10:00')],
        startDate: monday,
        endDate: monday,
      });
      expect(crossing).toEqual([
        { date: monday, slots: [{ startMinutes: 600, endMinutes: 1080 }] },
      ]);
    });

    it('窓全体が予定で埋まっている日は結果に含まれないこと', () => {
      const result = makeService().listCommonFreeSlots({
        userIds: ['u1'],
        schedules: [makeSchedule('u1', '2026-05-25', '09:00', '18:00')],
        startDate: monday,
        endDate: monday,
      });

      expect(result).toEqual([]);
    });

    it('対象外ユーザーの予定は無視されること', () => {
      const result = makeService().listCommonFreeSlots({
        userIds: ['u1'],
        schedules: [makeSchedule('u99', '2026-05-25', '09:00', '18:00')],
        startDate: monday,
        endDate: monday,
      });

      expect(result).toEqual([
        { date: monday, slots: [{ startMinutes: 540, endMinutes: 1080 }] },
      ]);
    });

    it('不正な時刻の予定(空文字・範囲外・終了が開始以前)は無視されること', () => {
      const result = makeService().listCommonFreeSlots({
        userIds: ['u1'],
        schedules: [
          makeSchedule('u1', '2026-05-25', '', ''),
          makeSchedule('u1', '2026-05-25', '25:00', '26:00'),
          makeSchedule('u1', '2026-05-25', '12:00', '11:00'),
          makeSchedule('u1', '2026-05-25', '12:00', '12:00'),
          makeSchedule('u1', '2026-05-25', '10:99', '11:00'),
        ],
        startDate: monday,
        endDate: monday,
      });

      expect(result).toEqual([
        { date: monday, slots: [{ startMinutes: 540, endMinutes: 1080 }] },
      ]);
    });

    it('対象ユーザーが空、または開始日が終了日より後の場合は空配列を返すこと', () => {
      expect(
        makeService().listCommonFreeSlots({
          userIds: [],
          schedules: [],
          startDate: monday,
          endDate: monday,
        })
      ).toEqual([]);

      expect(
        makeService().listCommonFreeSlots({
          userIds: ['u1'],
          schedules: [],
          startDate: tuesday,
          endDate: monday,
        })
      ).toEqual([]);
    });

    it('複数日の結果が日付昇順で返り、dateがUTC深夜0時であること', () => {
      // 5/25(月)〜5/27(水)、5/26(火)は終日予定あり → 5/25, 5/27 のみ
      const result = makeService().listCommonFreeSlots({
        userIds: ['u1'],
        schedules: [makeSchedule('u1', '2026-05-26', '09:00', '18:00')],
        startDate: monday,
        endDate: wednesday,
      });

      expect(result.map((d) => d.date.toISOString())).toEqual([
        '2026-05-25T00:00:00.000Z',
        '2026-05-27T00:00:00.000Z',
      ]);
      expect(result.map((d) => d.slots)).toEqual([
        [{ startMinutes: 540, endMinutes: 1080 }],
        [{ startMinutes: 540, endMinutes: 1080 }],
      ]);
    });
  });
});
