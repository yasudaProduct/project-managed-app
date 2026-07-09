import {
  parseSchedulingSettings,
  DEFAULT_SCHEDULING_SETTINGS,
} from "@/types/scheduling-settings";

describe("parseSchedulingSettings", () => {
  test("null/非objectはデフォルトを返す", () => {
    expect(parseSchedulingSettings(null)).toEqual(DEFAULT_SCHEDULING_SETTINGS);
    expect(parseSchedulingSettings("x")).toEqual(DEFAULT_SCHEDULING_SETTINGS);
    expect(parseSchedulingSettings(undefined)).toEqual(
      DEFAULT_SCHEDULING_SETTINGS
    );
  });

  test("steadyTaskKeywordsは文字列のみ・trim・空除外で正規化", () => {
    const r = parseSchedulingSettings({
      steadyTaskKeywords: [" 管理 ", "", 5, "会議"],
    });
    expect(r.steadyTaskKeywords).toEqual(["管理", "会議"]);
  });

  test("consumeSteadyTaskCapacity / steadyDailyHoursMode を正規化", () => {
    const r = parseSchedulingSettings({
      consumeSteadyTaskCapacity: true,
      steadyDailyHoursMode: "FIXED",
    });
    expect(r.consumeSteadyTaskCapacity).toBe(true);
    expect(r.steadyDailyHoursMode).toBe("FIXED");
  });

  test("不正なmodeはPRORATEにフォールバック", () => {
    const r = parseSchedulingSettings({ steadyDailyHoursMode: "XXX" });
    expect(r.steadyDailyHoursMode).toBe("PRORATE");
  });

  test("steadyFixedHoursByKeywordは数値値のみ残す", () => {
    const r = parseSchedulingSettings({
      steadyFixedHoursByKeyword: { 管理: 10, 会議: "abc", 設計: NaN, 実装: 5 },
    });
    expect(r.steadyFixedHoursByKeyword).toEqual({ 管理: 10, 実装: 5 });
  });

  test("steadyFixedHoursByKeywordがobjectでなければundefined", () => {
    const r = parseSchedulingSettings({ steadyFixedHoursByKeyword: "x" });
    expect(r.steadyFixedHoursByKeyword).toBeUndefined();
  });

  test("欠損時はsteadyFixedHoursByKeywordを持たない", () => {
    const r = parseSchedulingSettings({ steadyTaskKeywords: ["管理"] });
    expect(r.steadyFixedHoursByKeyword).toBeUndefined();
  });

  test("steadyTaskForecastModeは有効値のみ採用しデフォルトはPLANNED", () => {
    expect(parseSchedulingSettings({}).steadyTaskForecastMode).toBe("PLANNED");
    expect(
      parseSchedulingSettings({ steadyTaskForecastMode: "ACTUAL_PACE" })
        .steadyTaskForecastMode
    ).toBe("ACTUAL_PACE");
    expect(
      parseSchedulingSettings({ steadyTaskForecastMode: "PLANNED_PACE" })
        .steadyTaskForecastMode
    ).toBe("PLANNED_PACE");
    expect(
      parseSchedulingSettings({ steadyTaskForecastMode: "XXX" })
        .steadyTaskForecastMode
    ).toBe("PLANNED");
  });
});
