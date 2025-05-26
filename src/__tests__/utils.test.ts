import { formatDateyyyymmdd, getProjectStatusName, isHoliday } from "@/lib/utils";

describe("utils", () => {
  describe("formatDateyyyymmdd", () => {
    it("日付文字列をyyyy/mm/dd形式にフォーマットできること", () => {
      expect(formatDateyyyymmdd("2025-05-05")).toBe("2025/05/05");
    });

    it("月と日が1桁の場合も正しくフォーマットされること", () => {
      expect(formatDateyyyymmdd("2025-1-5")).toBe("2025/01/05");
    });

    it("空文字列の場合はundefinedを返すこと", () => {
      expect(formatDateyyyymmdd("")).toBeUndefined();
    });

    it("無効な日付文字列の場合はundefinedを返すこと", () => {
      expect(formatDateyyyymmdd("invalid-date")).toBeUndefined();
    });

    it("nullの場合はundefinedを返すこと", () => {
      // @ts-expect-error - nullを渡す
      expect(formatDateyyyymmdd(null)).toBeUndefined();
    });
  });

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