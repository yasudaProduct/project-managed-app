import { getWeekNumber } from "@/components/ganttv3/utils/timelineHeaders";

// ローカルタイム基準の計算のため、テストもローカル構築の Date を使い
// 実行環境のTZに依存しない自己整合な値を検証する。
describe("getWeekNumber", () => {
  it("年初(1/1)は第1週", () => {
    // 2024-01-01 は月曜
    expect(getWeekNumber(new Date(2024, 0, 1))).toBe(1);
  });

  it("7日進むごとに週番号が1つ増える", () => {
    expect(getWeekNumber(new Date(2024, 0, 8))).toBe(2);
    expect(getWeekNumber(new Date(2024, 0, 15))).toBe(3);
    expect(getWeekNumber(new Date(2024, 0, 22))).toBe(4);
  });

  it("正の整数を返す", () => {
    const w = getWeekNumber(new Date(2024, 5, 15));
    expect(Number.isInteger(w)).toBe(true);
    expect(w).toBeGreaterThan(0);
  });
});
