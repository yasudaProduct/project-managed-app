import { getProjectStatusName } from "@/utils/utils";
import { isHoliday } from "@/utils/date-util";

describe("utils", () => {

  describe("getProjectStatusName", () => {
    it("INACTIVEは「未開始」と表示されること", () => {
      expect(getProjectStatusName("INACTIVE")).toBe("未開始");
    });

    it("ACTIVEは「進行中」と表示されること", () => {
      expect(getProjectStatusName("ACTIVE")).toBe("進行中");
    });

    it("DONEは「完了」と表示されること", () => {
      expect(getProjectStatusName("DONE")).toBe("完了");
    });

    it("CANCELLEDは「中止」と表示されること", () => {
      expect(getProjectStatusName("CANCELLED")).toBe("中止");
    });

    it("PENDINGは「保留」と表示されること", () => {
      expect(getProjectStatusName("PENDING")).toBe("保留");
    });

    it("未知のステータスは「不明」と表示されること", () => {
      // @ts-expect-error - テスト目的で無効な値を渡す
      expect(getProjectStatusName("UNKNOWN")).toBe("不明");
    });
  });

  describe("isHoliday", () => {
    it("土日は祝日として判定されること", () => {
      expect(isHoliday(new Date("2025-07-06"))).toBe(true);
    });

    it("祝日は祝日として判定されること", () => {
      expect(isHoliday(new Date("2025-07-21"))).toBe(true);
    });

    it("平日は祝日として判定されないこと", () => {
      expect(isHoliday(new Date("2025-07-22"))).toBe(false);
    });
  });
});