import {
  MS_PER_DAY,
  getScaleMultiplier,
  getTotalDays,
  getTotalColumns,
  dateToX,
  getChartWidth,
} from "@/components/ganttv3/utils/timelineGeometry";

const base = Date.UTC(2024, 0, 1); // 2024-01-01T00:00:00.000Z
const day = (n: number) => new Date(base + n * MS_PER_DAY);

describe("getScaleMultiplier", () => {
  it("各スケールの日数換算", () => {
    expect(getScaleMultiplier("day")).toBe(1);
    expect(getScaleMultiplier("week")).toBe(7);
    expect(getScaleMultiplier("month")).toBe(30);
    expect(getScaleMultiplier("quarter")).toBe(90);
  });

  it("year はGanttChart基準の90に統一", () => {
    expect(getScaleMultiplier("year")).toBe(90);
  });
});

describe("getTotalDays", () => {
  it("日数を切り上げで返す", () => {
    expect(getTotalDays(day(0), day(10))).toBe(10);
  });

  it("端数は切り上げ", () => {
    expect(getTotalDays(day(0), new Date(base + 10.2 * MS_PER_DAY))).toBe(11);
  });
});

describe("getTotalColumns", () => {
  it("総日数をスケールで割って切り上げ", () => {
    expect(getTotalColumns(10, 1)).toBe(10);
    expect(getTotalColumns(10, 7)).toBe(2);
    expect(getTotalColumns(90, 30)).toBe(3);
  });
});

describe("dateToX", () => {
  it("開始日は X=0", () => {
    expect(dateToX(day(0), day(0), 1, 40)).toBe(0);
  });

  it("day スケール: 経過日数 × 列幅", () => {
    expect(dateToX(day(7), day(0), 1, 40)).toBe(280);
  });

  it("week スケール: (経過日数/7) × 列幅", () => {
    expect(dateToX(day(7), day(0), 7, 80)).toBe(80);
    expect(dateToX(day(14), day(0), 7, 80)).toBe(160);
  });
});

describe("getChartWidth", () => {
  it("内容幅が最小幅を超える場合は内容幅", () => {
    expect(getChartWidth(100, 1, 40)).toBe(4000);
  });

  it("内容幅が最小幅未満なら最小幅(既定1200)にクランプ", () => {
    expect(getChartWidth(10, 1, 40)).toBe(1200);
  });

  it("最小幅は指定可能", () => {
    expect(getChartWidth(10, 1, 40, 100)).toBe(400);
  });
});
