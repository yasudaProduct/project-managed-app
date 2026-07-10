import {
  getParentScale,
  getParentLabel,
  buildChildHeaders,
  buildParentHeaders,
} from "@/components/gantt/utils/timelineHeaders";

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

  it("month: 開始日が31日でも月がロールオーバーせず連続する（2月が欠落しない）", () => {
    const headers = buildChildHeaders(
      new Date(2024, 0, 31), // 2024-01-31（29〜31日開始でロールオーバーの温床）
      new Date(2024, 4, 1), // 2024-05-01
      "month",
    );
    // 各ヘッダの月が 1月(0),2月(1),3月(2),4月(3) と欠落なく連続する
    const months = headers.map((h) => h.date.getMonth());
    expect(months.slice(0, 4)).toEqual([0, 1, 2, 3]);
  });

  it("quarter: 開始日が31日でも四半期の開始月がずれない", () => {
    const headers = buildChildHeaders(
      new Date(2024, 0, 31),
      new Date(2024, 9, 1),
      "quarter",
    );
    // 3ヶ月ずつ進む（0→3→6...）。ロールオーバーすると 4 になり崩れる
    const months = headers.map((h) => h.date.getMonth());
    expect(months[0]).toBe(0);
    expect(months[1]).toBe(3);
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
