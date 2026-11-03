import {
  CalendarEvent,
  MAX_CALENDAR_EVENT_SPAN_DAYS,
  type CalendarEventParams,
} from "@/domains/calendar/calendar-event";

const utc = (ymd: string): Date => new Date(`${ymd}T00:00:00.000Z`);
const hm = (hours: number, minutes = 0): number => hours * 60 + minutes;

const baseParams: CalendarEventParams = {
  title: "定例会議",
  startDate: utc("2026-11-02"),
  startMinutes: hm(10),
  endDate: utc("2026-11-02"),
  endMinutes: hm(11, 30),
  isAllDay: false,
  availability: "busy",
  location: "会議室A",
  description: "週次の定例",
};

describe("CalendarEvent", () => {
  describe("create", () => {
    it("正しいパラメータで生成できること", () => {
      const event = CalendarEvent.create(baseParams);

      expect(event.title).toBe("定例会議");
      expect(event.isAllDay).toBe(false);
      expect(event.availability).toBe("busy");
    });

    it("終了日時が開始日時より前の場合はエラーになること", () => {
      expect(() =>
        CalendarEvent.create({ ...baseParams, startMinutes: hm(12), endMinutes: hm(11) })
      ).toThrow("終了日時が開始日時より前です");
    });

    it("終了日が開始日より前の場合はエラーになること", () => {
      expect(() =>
        CalendarEvent.create({ ...baseParams, startDate: utc("2026-11-03"), endDate: utc("2026-11-02") })
      ).toThrow("終了日時が開始日時より前です");
    });

    it("終日の予定で終了日が開始日より前の場合はエラーになること", () => {
      expect(() =>
        CalendarEvent.create({
          ...baseParams,
          isAllDay: true,
          startDate: utc("2026-11-03"),
          startMinutes: 0,
          endDate: utc("2026-11-02"),
          endMinutes: 0,
        })
      ).toThrow("終了日時が開始日時より前です");
    });

    it("時刻が0〜1440分の範囲外の場合はエラーになること", () => {
      expect(() => CalendarEvent.create({ ...baseParams, startMinutes: -1 })).toThrow("時刻が不正です");
      expect(() => CalendarEvent.create({ ...baseParams, endMinutes: 1441 })).toThrow("時刻が不正です");
      expect(() => CalendarEvent.create({ ...baseParams, endMinutes: 30.5 })).toThrow("時刻が不正です");
    });

    it("日付がUTC0時でない場合はエラーになること", () => {
      expect(() =>
        CalendarEvent.create({ ...baseParams, startDate: new Date("2026-11-02T09:00:00.000Z") })
      ).toThrow("日付が不正です");
    });

    it(`期間が${MAX_CALENDAR_EVENT_SPAN_DAYS}日を超える場合はエラーになること`, () => {
      expect(() =>
        CalendarEvent.create({
          ...baseParams,
          isAllDay: true,
          startDate: utc("2026-01-01"),
          startMinutes: 0,
          endDate: utc("2027-01-03"),
          endMinutes: 0,
        })
      ).toThrow("予定の期間が長すぎます");
    });

    it(`期間がちょうど${MAX_CALENDAR_EVENT_SPAN_DAYS}日の場合は生成できること`, () => {
      // 2028年は閏年（366日）。終日予定の終了は翌日0時（排他）
      expect(() =>
        CalendarEvent.create({
          ...baseParams,
          isAllDay: true,
          startDate: utc("2028-01-01"),
          startMinutes: 0,
          endDate: utc("2029-01-01"),
          endMinutes: 0,
        })
      ).not.toThrow();
    });
  });

  describe("isBlocking", () => {
    it.each([
      ["busy", true],
      ["tentative", true],
      ["outOfOffice", true],
      ["free", false],
      ["workingElsewhere", false],
    ] as const)("公開方法が %s の場合は %s を返すこと", (availability, expected) => {
      const event = CalendarEvent.create({ ...baseParams, availability });

      expect(event.isBlocking()).toBe(expected);
    });

    it("全休タイトルの予定は空き時間でも稼働を妨げる予定とみなすこと", () => {
      const event = CalendarEvent.create({
        ...baseParams,
        title: "休暇",
        isAllDay: true,
        startMinutes: 0,
        endDate: utc("2026-11-03"),
        endMinutes: 0,
        availability: "free",
      });

      expect(event.isBlocking()).toBe(true);
    });
  });

  describe("toDailySchedules", () => {
    it("同日内の予定は1件のスケジュールになること", () => {
      const event = CalendarEvent.create(baseParams);

      expect(event.toDailySchedules("u1")).toEqual([
        {
          userId: "u1",
          date: utc("2026-11-02"),
          startTime: "10:00",
          endTime: "11:30",
          title: "定例会議",
          location: "会議室A",
          description: "週次の定例",
        },
      ]);
    });

    it("場所・内容が空の場合はundefinedになること", () => {
      const event = CalendarEvent.create({ ...baseParams, location: "", description: undefined });

      const [schedule] = event.toDailySchedules("u1");

      expect(schedule.location).toBeUndefined();
      expect(schedule.description).toBeUndefined();
    });

    it("1日の終日予定（終了は翌日0時）は 00:00〜24:00 の1件になること", () => {
      const event = CalendarEvent.create({
        ...baseParams,
        title: "社内研修",
        isAllDay: true,
        startMinutes: 0,
        endDate: utc("2026-11-03"),
        endMinutes: 0,
      });

      expect(event.toDailySchedules("u1")).toEqual([
        expect.objectContaining({ date: utc("2026-11-02"), startTime: "00:00", endTime: "24:00", title: "社内研修" }),
      ]);
    });

    it("終了日が開始日と同じ終日予定も1日分になること", () => {
      const event = CalendarEvent.create({
        ...baseParams,
        isAllDay: true,
        startMinutes: 0,
        endDate: utc("2026-11-02"),
        endMinutes: 0,
      });

      expect(event.toDailySchedules("u1")).toEqual([
        expect.objectContaining({ date: utc("2026-11-02"), startTime: "00:00", endTime: "24:00" }),
      ]);
    });

    it("複数日の終日予定は日ごとに分割されること", () => {
      const event = CalendarEvent.create({
        ...baseParams,
        title: "夏季休暇",
        isAllDay: true,
        startDate: utc("2026-08-12"),
        startMinutes: 0,
        endDate: utc("2026-08-15"),
        endMinutes: 0,
      });

      const schedules = event.toDailySchedules("u1");

      expect(schedules.map((s) => [s.date.toISOString().slice(0, 10), s.startTime, s.endTime])).toEqual([
        ["2026-08-12", "00:00", "24:00"],
        ["2026-08-13", "00:00", "24:00"],
        ["2026-08-14", "00:00", "24:00"],
      ]);
    });

    it("日をまたぐ予定は初日・中日・最終日に分割されること", () => {
      const event = CalendarEvent.create({
        ...baseParams,
        title: "出張",
        startDate: utc("2026-11-02"),
        startMinutes: hm(13),
        endDate: utc("2026-11-04"),
        endMinutes: hm(12, 15),
      });

      const schedules = event.toDailySchedules("u1");

      expect(schedules.map((s) => [s.date.toISOString().slice(0, 10), s.startTime, s.endTime])).toEqual([
        ["2026-11-02", "13:00", "24:00"],
        ["2026-11-03", "00:00", "24:00"],
        ["2026-11-04", "00:00", "12:15"],
      ]);
    });

    it("日をまたぐ予定の終了が翌日0時ちょうどの場合は翌日分を作らないこと", () => {
      const event = CalendarEvent.create({
        ...baseParams,
        title: "夜間作業",
        startMinutes: hm(22),
        endDate: utc("2026-11-03"),
        endMinutes: 0,
      });

      expect(event.toDailySchedules("u1").map((s) => [s.date.toISOString().slice(0, 10), s.startTime, s.endTime])).toEqual([
        ["2026-11-02", "22:00", "24:00"],
      ]);
    });

    it("月末・年末をまたぐ予定も正しく分割されること", () => {
      const event = CalendarEvent.create({
        ...baseParams,
        isAllDay: true,
        startDate: utc("2026-12-31"),
        startMinutes: 0,
        endDate: utc("2027-01-02"),
        endMinutes: 0,
      });

      expect(event.toDailySchedules("u1").map((s) => s.date.toISOString().slice(0, 10))).toEqual([
        "2026-12-31",
        "2027-01-01",
      ]);
    });

    it("開始と終了が同時刻の予定は0分のスケジュール1件になること", () => {
      const event = CalendarEvent.create({ ...baseParams, startMinutes: hm(9), endMinutes: hm(9) });

      expect(event.toDailySchedules("u1").map((s) => [s.startTime, s.endTime])).toEqual([["09:00", "09:00"]]);
    });
  });

  describe("coveredDateRange", () => {
    it("同日内の予定は開始日〜開始日を返すこと", () => {
      const event = CalendarEvent.create(baseParams);

      expect(event.coveredDateRange()).toEqual({ startDate: utc("2026-11-02"), endDate: utc("2026-11-02") });
    });

    it("終日予定は排他終了日の前日までを返すこと", () => {
      const event = CalendarEvent.create({
        ...baseParams,
        isAllDay: true,
        startDate: utc("2026-08-12"),
        startMinutes: 0,
        endDate: utc("2026-08-15"),
        endMinutes: 0,
      });

      expect(event.coveredDateRange()).toEqual({ startDate: utc("2026-08-12"), endDate: utc("2026-08-14") });
    });

    it("日をまたぐ予定は終了日までを返すこと", () => {
      const event = CalendarEvent.create({
        ...baseParams,
        startMinutes: hm(13),
        endDate: utc("2026-11-04"),
        endMinutes: hm(12),
      });

      expect(event.coveredDateRange()).toEqual({ startDate: utc("2026-11-02"), endDate: utc("2026-11-04") });
    });
  });
});
