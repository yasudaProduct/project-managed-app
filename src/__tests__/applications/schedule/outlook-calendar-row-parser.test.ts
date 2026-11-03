import { parseOutlookCalendarRows } from "@/applications/schedule/outlook-calendar-row-parser";
import type { OutlookCalendarRowDto } from "@/types/outlook-calendar";

const utc = (ymd: string): Date => new Date(`${ymd}T00:00:00.000Z`);

/** 日本語版 Outlook のエクスポート1行に相当する行 */
const jaRow = (overrides: Partial<OutlookCalendarRowDto> = {}): OutlookCalendarRowDto => ({
  rowNumber: 2,
  subject: "定例会議",
  startDate: "2026/11/2",
  startTime: "10:00:00",
  endDate: "2026/11/2",
  endTime: "11:30:00",
  allDay: "FALSE",
  location: "会議室A",
  description: "週次の定例",
  showTimeAs: "2",
  ...overrides,
});

describe("parseOutlookCalendarRows", () => {
  it("日本語版の行をCalendarEventへ変換すること", () => {
    const { events, errors } = parseOutlookCalendarRows([jaRow()]);

    expect(errors).toEqual([]);
    expect(events).toHaveLength(1);
    expect(events[0].title).toBe("定例会議");
    expect(events[0].isAllDay).toBe(false);
    expect(events[0].availability).toBe("busy");
    expect(events[0].toDailySchedules("u1")).toEqual([
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

  it("英語版（M/D/YYYY・AM/PM形式）の行を変換すること", () => {
    const { events, errors } = parseOutlookCalendarRows([
      jaRow({
        subject: "Team meeting",
        startDate: "11/2/2026",
        startTime: "9:30:00 AM",
        endDate: "11/2/2026",
        endTime: "1:15:00 PM",
        allDay: "False",
      }),
    ]);

    expect(errors).toEqual([]);
    expect(events[0].toDailySchedules("u1")).toEqual([
      expect.objectContaining({ date: utc("2026-11-02"), startTime: "09:30", endTime: "13:15", title: "Team meeting" }),
    ]);
  });

  it.each([
    ["12:00:00 AM", "00:00"],
    ["12:30 PM", "12:30"],
    ["午前 9:05:00", "09:05"],
    ["午後 1:00", "13:00"],
    ["午前 12:00:00", "00:00"],
    ["9:00", "09:00"],
    ["  18:45:00  ", "18:45"],
  ])("開始時刻 %s を %s と解釈すること", (startTime, expected) => {
    const { events, errors } = parseOutlookCalendarRows([jaRow({ startTime, endTime: "23:59:00" })]);

    expect(errors).toEqual([]);
    expect(events[0].toDailySchedules("u1")[0].startTime).toBe(expected);
  });

  it.each([
    ["2026/11/02", "2026-11-02"],
    ["2026-11-2", "2026-11-02"],
    ["11/02/2026", "2026-11-02"],
    ["2026/11/2 0:00:00", "2026-11-02"],
  ])("日付 %s を %s と解釈すること", (date, expected) => {
    const { events, errors } = parseOutlookCalendarRows([jaRow({ startDate: date, endDate: date })]);

    expect(errors).toEqual([]);
    expect(events[0].toDailySchedules("u1")[0].date).toEqual(utc(expected));
  });

  it("終日イベントを終日予定として変換すること（終了は翌日0時の排他終了）", () => {
    const { events } = parseOutlookCalendarRows([
      jaRow({
        subject: "夏季休暇",
        startDate: "2026/8/12",
        startTime: "0:00:00",
        endDate: "2026/8/15",
        endTime: "0:00:00",
        allDay: "TRUE",
        showTimeAs: "4",
      }),
    ]);

    expect(events[0].isAllDay).toBe(true);
    expect(events[0].toDailySchedules("u1").map((s) => s.date)).toEqual([
      utc("2026-08-12"),
      utc("2026-08-13"),
      utc("2026-08-14"),
    ]);
  });

  it.each(["TRUE", "True", "true", "1", "はい", "オン", "Yes"])("終日イベント %s を真とみなすこと", (allDay) => {
    const { events } = parseOutlookCalendarRows([jaRow({ allDay })]);

    expect(events[0].isAllDay).toBe(true);
  });

  it("開始時刻・終了時刻が空の行は終日予定とみなすこと", () => {
    const { events, errors } = parseOutlookCalendarRows([
      jaRow({ startTime: "", endTime: "", endDate: "", allDay: undefined }),
    ]);

    expect(errors).toEqual([]);
    expect(events[0].isAllDay).toBe(true);
    expect(events[0].toDailySchedules("u1")).toEqual([
      expect.objectContaining({ date: utc("2026-11-02"), startTime: "00:00", endTime: "24:00" }),
    ]);
  });

  it("終了日が空の場合は開始日と同じ日とみなすこと", () => {
    const { events, errors } = parseOutlookCalendarRows([jaRow({ endDate: "" })]);

    expect(errors).toEqual([]);
    expect(events[0].toDailySchedules("u1")).toEqual([
      expect.objectContaining({ date: utc("2026-11-02"), startTime: "10:00", endTime: "11:30" }),
    ]);
  });

  it("終了時刻が空の場合は開始時刻と同じとみなすこと", () => {
    const { events, errors } = parseOutlookCalendarRows([jaRow({ endTime: "" })]);

    expect(errors).toEqual([]);
    expect(events[0].toDailySchedules("u1")[0]).toEqual(
      expect.objectContaining({ startTime: "10:00", endTime: "10:00" })
    );
  });

  it.each([
    ["0", "workingElsewhere"],
    ["1", "tentative"],
    ["2", "busy"],
    ["3", "free"],
    ["4", "outOfOffice"],
    ["空き時間", "free"],
    ["Free", "free"],
    ["仮の予定", "tentative"],
    ["Tentative", "tentative"],
    ["予定あり", "busy"],
    ["Busy", "busy"],
    ["外出中", "outOfOffice"],
    ["Out of Office", "outOfOffice"],
    ["他の場所で作業中", "workingElsewhere"],
    ["Working Elsewhere", "workingElsewhere"],
    ["", "busy"],
    [undefined, "busy"],
    ["不明な値", "busy"],
  ])("公開方法 %s を %s と解釈すること", (showTimeAs, expected) => {
    const { events } = parseOutlookCalendarRows([jaRow({ showTimeAs })]);

    expect(events[0].availability).toBe(expected);
  });

  it("件名・場所・内容の前後空白を除去すること", () => {
    const { events } = parseOutlookCalendarRows([
      jaRow({ subject: "  定例会議  ", location: " 会議室A ", description: "  " }),
    ]);

    expect(events[0].toDailySchedules("u1")[0]).toEqual(
      expect.objectContaining({ title: "定例会議", location: "会議室A", description: undefined })
    );
  });

  describe("不正な行", () => {
    it("開始日が解釈できない行はエラーとして行番号と理由を返すこと", () => {
      const { events, errors } = parseOutlookCalendarRows([
        jaRow({ rowNumber: 2 }),
        jaRow({ rowNumber: 3, startDate: "あした" }),
      ]);

      expect(events).toHaveLength(1);
      expect(errors).toEqual([{ rowNumber: 3, message: "開始日が不正です（あした）" }]);
    });

    it("存在しない日付はエラーになること", () => {
      const { errors } = parseOutlookCalendarRows([jaRow({ startDate: "2026/2/30", endDate: "2026/2/30" })]);

      expect(errors).toEqual([{ rowNumber: 2, message: "開始日が不正です（2026/2/30）" }]);
    });

    it("開始日が空の行はエラーになること", () => {
      const { errors } = parseOutlookCalendarRows([jaRow({ startDate: "" })]);

      expect(errors).toEqual([{ rowNumber: 2, message: "開始日が不正です（）" }]);
    });

    it("終了日が解釈できない行はエラーになること", () => {
      const { errors } = parseOutlookCalendarRows([jaRow({ endDate: "2026/13/1" })]);

      expect(errors).toEqual([{ rowNumber: 2, message: "終了日が不正です（2026/13/1）" }]);
    });

    it.each(["25:00", "10:60", "13:00 PM", "abc"])("開始時刻 %s はエラーになること", (startTime) => {
      const { errors } = parseOutlookCalendarRows([jaRow({ startTime })]);

      expect(errors).toEqual([{ rowNumber: 2, message: `開始時刻が不正です（${startTime}）` }]);
    });

    it("終了時刻が解釈できない行はエラーになること", () => {
      const { errors } = parseOutlookCalendarRows([jaRow({ endTime: "99:99" })]);

      expect(errors).toEqual([{ rowNumber: 2, message: "終了時刻が不正です（99:99）" }]);
    });

    it("終日ではないのに開始時刻が空の行はエラーになること", () => {
      const { errors } = parseOutlookCalendarRows([jaRow({ startTime: "", endTime: "11:00:00" })]);

      expect(errors).toEqual([{ rowNumber: 2, message: "開始時刻が不正です（）" }]);
    });

    it("終了が開始より前の行はドメインのエラー理由を返すこと", () => {
      const { errors } = parseOutlookCalendarRows([jaRow({ startTime: "12:00:00", endTime: "11:00:00" })]);

      expect(errors).toEqual([{ rowNumber: 2, message: "終了日時が開始日時より前です" }]);
    });
  });
});
