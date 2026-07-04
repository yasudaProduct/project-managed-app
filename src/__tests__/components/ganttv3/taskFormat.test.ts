import {
  formatMonthDay,
  statusColor,
} from "@/components/ganttv3/utils/taskFormat";

describe("formatMonthDay", () => {
  it("MM/DD 形式（ゼロ埋め）で整形する", () => {
    expect(formatMonthDay(new Date(2024, 0, 5))).toBe("01/05");
    expect(formatMonthDay(new Date(2024, 11, 25))).toBe("12/25");
  });

  it("undefined は空文字", () => {
    expect(formatMonthDay(undefined)).toBe("");
  });
});

describe("statusColor", () => {
  it("各ステータスの色を返す", () => {
    expect(statusColor("COMPLETED")).toBe("#10B981");
    expect(statusColor("IN_PROGRESS")).toBe("#3B82F6");
    expect(statusColor("ON_HOLD")).toBe("#F59E0B");
    expect(statusColor("NOT_STARTED")).toBe("#9CA3AF");
  });

  it("未設定・未知は既定色(gray)", () => {
    expect(statusColor(undefined)).toBe("#9CA3AF");
  });
});
