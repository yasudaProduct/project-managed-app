import {
  nextAvailableDay,
  nextBusinessDay,
  consumeUntilDone,
  consumeBackward,
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

  describe("consumeBackward", () => {
    const floor = new Date(2026, 5, 15); // 月曜(基準日)

    test("1日で終わる: 締切日が開始日=終了日になる", () => {
      const r = consumeBackward(new Date(2026, 5, 24), 8, weekday8, undefined, floor)!;
      expect(r).not.toBeNull();
      expect(r.startDate).toEqual(new Date(2026, 5, 24));
      expect(r.endDate).toEqual(new Date(2026, 5, 24));
      expect(r.delta.get("2026-06-24")).toBe(8);
    });

    test("複数日工数は締切日から後方へ積む", () => {
      const r = consumeBackward(new Date(2026, 5, 24), 24, weekday8, undefined, floor)!;
      expect(r).not.toBeNull();
      expect(r.startDate).toEqual(new Date(2026, 5, 22));
      expect(r.endDate).toEqual(new Date(2026, 5, 24));
    });

    test("締切が非稼働日なら直前の稼働日が終了日になり、週末を跨いで遡る", () => {
      // 06-21 は日曜 → 終了日は 06-19(金)。16h は 06-18(木)〜06-19(金)
      const r = consumeBackward(new Date(2026, 5, 21), 16, weekday8, undefined, floor)!;
      expect(r).not.toBeNull();
      expect(r.startDate).toEqual(new Date(2026, 5, 18));
      expect(r.endDate).toEqual(new Date(2026, 5, 19));
    });

    test("consumedで満杯の日はスキップし、consumed自体は変更しない", () => {
      const consumed = new Map([["2026-06-24", 8]]);
      const r = consumeBackward(new Date(2026, 5, 24), 8, weekday8, consumed, floor)!;
      expect(r).not.toBeNull();
      expect(r.startDate).toEqual(new Date(2026, 5, 23));
      expect(r.endDate).toEqual(new Date(2026, 5, 23));
      expect(r.delta.get("2026-06-23")).toBe(8);
      expect(consumed.get("2026-06-24")).toBe(8); // 変更なし
      expect(consumed.has("2026-06-23")).toBe(false); // deltaに分離
    });

    test("部分消費の日は残余だけ使って後方へ続く", () => {
      const consumed = new Map([["2026-06-24", 6]]);
      const r = consumeBackward(new Date(2026, 5, 24), 8, weekday8, consumed, floor)!;
      expect(r).not.toBeNull();
      expect(r.startDate).toEqual(new Date(2026, 5, 23));
      expect(r.endDate).toEqual(new Date(2026, 5, 24));
      expect(r.delta.get("2026-06-24")).toBe(2);
      expect(r.delta.get("2026-06-23")).toBe(6);
    });

    test("floor(基準日)までに収まらなければnull", () => {
      // 06-15(月)〜06-16(火) の16hしか無いのに24h → 配置不可
      const r = consumeBackward(new Date(2026, 5, 16), 24, weekday8, undefined, floor);
      expect(r).toBeNull();
    });

    test("締切がfloorより前ならnull", () => {
      const r = consumeBackward(new Date(2026, 5, 14), 8, weekday8, undefined, floor);
      expect(r).toBeNull();
    });

    test("工数0は締切以前の直近稼働日に配置し、稼働は消費しない", () => {
      const r = consumeBackward(new Date(2026, 5, 21), 0, weekday8, undefined, floor)!;
      expect(r).not.toBeNull();
      expect(r.startDate).toEqual(new Date(2026, 5, 19));
      expect(r.endDate).toEqual(new Date(2026, 5, 19));
      expect(r.delta.size).toBe(0);
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
