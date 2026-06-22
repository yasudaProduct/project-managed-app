import {
  getParentScale,
  getParentLabel,
  buildChildHeaders,
  buildParentHeaders,
} from "@/components/ganttv3/utils/timelineHeaders";

describe("getParentScale", () => {
  it("各スケールの親スケール", () => {
    expect(getParentScale("day")).toBe("month");
    expect(getParentScale("week")).toBe("month");
    expect(getParentScale("month")).toBe("year");
    expect(getParentScale("quarter")).toBe("year");
  });

  it("year に親はない", () => {
    expect(getParentScale("year")).toBeNull();
  });
});

describe("getParentLabel", () => {
  it("year は西暦4桁", () => {
    expect(getParentLabel(new Date(2024, 0, 1), "year")).toBe("2024");
  });
});

describe("buildChildHeaders", () => {
  it("day: 1日ごとに1カラム、1日は isMainHeader", () => {
    const headers = buildChildHeaders(
      new Date(2024, 0, 1),
      new Date(2024, 0, 4),
      "day",
    );
    expect(headers).toHaveLength(3);
    expect(headers[0].label).toBe("1/1");
    expect(headers[0].isMainHeader).toBe(true); // 1日
    expect(headers[1].isMainHeader).toBe(false);
  });

  it("day: 土日は isWeekend", () => {
    // 2024-01-06(土), 07(日)
    const headers = buildChildHeaders(
      new Date(2024, 0, 5),
      new Date(2024, 0, 9),
      "day",
    );
    const byLabel = new Map(headers.map((h) => [h.label, h.isWeekend]));
    expect(byLabel.get("1/6")).toBe(true);
    expect(byLabel.get("1/7")).toBe(true);
    expect(byLabel.get("1/5")).toBe(false);
  });

  it("week: W{番号}ラベルで7日ごと", () => {
    const headers = buildChildHeaders(
      new Date(2024, 0, 1),
      new Date(2024, 0, 22),
      "week",
    );
    expect(headers.length).toBeGreaterThanOrEqual(3);
    expect(headers[0].label).toMatch(/^W\d+$/);
  });
});

describe("buildParentHeaders", () => {
  it("day×month: 同月の子をまとめ span を集計", () => {
    const children = buildChildHeaders(
      new Date(2024, 0, 30),
      new Date(2024, 1, 3),
      "day",
    );
    const parents = buildParentHeaders(children, "month");
    // 1月と2月の2グループ
    expect(parents).toHaveLength(2);
    const totalSpan = parents.reduce((s, p) => s + p.span, 0);
    expect(totalSpan).toBe(children.length);
  });
});
