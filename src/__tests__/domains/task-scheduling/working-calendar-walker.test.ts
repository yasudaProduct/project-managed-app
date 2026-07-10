import {
  nextAvailableDay,
  nextBusinessDay,
  consumeUntilDone,
  countWorkingDays,
  type WorkingCalendar,
} from "@/domains/task-scheduling/working-calendar-walker";

// 平日8h、土日0h。2026-06-15 は月曜。
const weekday8: WorkingCalendar = {
  getAvailableHours: (d) => (d.getDay() === 0 || d.getDay() === 6 ? 0 : 8),
};

describe("working-calendar-walker", () => {
  describe("nextAvailableDay", () => {
    test("稼働日はその日を返す", () => {
      expect(nextAvailableDay(new Date(2026, 5, 15), weekday8)).toEqual(
        new Date(2026, 5, 15)
      );
    });
    test("土曜は翌月曜へ", () => {
      expect(nextAvailableDay(new Date(2026, 5, 20), weekday8)).toEqual(
        new Date(2026, 5, 22)
      );
    });
    test("consumedで稼働0になった日はスキップ", () => {
      const consumed = new Map([["2026-06-15", 8]]);
      expect(
        nextAvailableDay(new Date(2026, 5, 15), weekday8, consumed)
      ).toEqual(new Date(2026, 5, 16));
    });
    test("部分消費で稼働が残る日はその日を返す", () => {
      const consumed = new Map([["2026-06-15", 6]]);
      expect(
        nextAvailableDay(new Date(2026, 5, 15), weekday8, consumed)
      ).toEqual(new Date(2026, 5, 15));
    });
  });

  describe("nextBusinessDay", () => {
    test("金曜の翌営業日は月曜", () => {
      expect(nextBusinessDay(new Date(2026, 5, 19), weekday8)).toEqual(
        new Date(2026, 5, 22)
      );
    });
    test("月曜の翌営業日は火曜", () => {
      expect(nextBusinessDay(new Date(2026, 5, 15), weekday8)).toEqual(
        new Date(2026, 5, 16)
      );
    });
  });

  describe("consumeUntilDone", () => {
    test("1日で終わる", () => {
      const r = consumeUntilDone(new Date(2026, 5, 15), 8, weekday8);
      expect(r.endDate).toEqual(new Date(2026, 5, 15));
      expect(r.overflow).toBe(false);
    });
    test("2日かかる", () => {
      const r = consumeUntilDone(new Date(2026, 5, 15), 16, weekday8);
      expect(r.endDate).toEqual(new Date(2026, 5, 16));
    });
    test("週末をまたぐ", () => {
      const r = consumeUntilDone(new Date(2026, 5, 19), 16, weekday8);
      expect(r.endDate).toEqual(new Date(2026, 5, 22));
    });
    test("半端な工数も最終稼働日で終わる", () => {
      const r = consumeUntilDone(new Date(2026, 5, 15), 10, weekday8);
      expect(r.endDate).toEqual(new Date(2026, 5, 16));
    });
    test("全日稼働0ならoverflow", () => {
      const noWork: WorkingCalendar = { getAvailableHours: () => 0 };
      const r = consumeUntilDone(new Date(2026, 5, 15), 8, noWork);
      expect(r.overflow).toBe(true);
    });
    test("消化した工数をconsumedに記録する（部分消費）", () => {
      const consumed = new Map<string, number>();
      const r = consumeUntilDone(new Date(2026, 5, 15), 2, weekday8, consumed);
      expect(r.endDate).toEqual(new Date(2026, 5, 15));
      expect(consumed.get("2026-06-15")).toBe(2);
    });
    test("既存のconsumedを差し引いた残りから消化し、消費を積み増す", () => {
      const consumed = new Map([["2026-06-15", 6]]);
      const r = consumeUntilDone(new Date(2026, 5, 15), 4, weekday8, consumed);
      // 06-15の残り2hを使い、残工数2hは06-16へ
      expect(r.endDate).toEqual(new Date(2026, 5, 16));
      expect(consumed.get("2026-06-15")).toBe(8);
      expect(consumed.get("2026-06-16")).toBe(2);
    });
    test("複数日にまたがる消費もconsumedに記録する", () => {
      const consumed = new Map<string, number>();
      const r = consumeUntilDone(new Date(2026, 5, 15), 10, weekday8, consumed);
      expect(r.endDate).toEqual(new Date(2026, 5, 16));
      expect(consumed.get("2026-06-15")).toBe(8);
      expect(consumed.get("2026-06-16")).toBe(2);
    });
  });

  describe("countWorkingDays", () => {
    test("月〜金は5稼働日", () => {
      expect(
        countWorkingDays(new Date(2026, 5, 15), new Date(2026, 5, 19), weekday8)
      ).toBe(5);
    });
    test("週末を含む範囲は稼働日のみカウント", () => {
      expect(
        countWorkingDays(new Date(2026, 5, 15), new Date(2026, 5, 21), weekday8)
      ).toBe(5);
    });
  });
});
