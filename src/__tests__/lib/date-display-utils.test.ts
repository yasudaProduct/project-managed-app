import {
  formatUTCDateForDisplaySlash,
  utcToLocalDate,
} from "@/lib/date-display-utils";

describe("date-display-utils", () => {

  describe("formatUTCDateForDisplaySlash", () => {
    it("UTC日付をYYYY/MM/DD形式で表示する", () => {
      const utcDate = new Date("2024-01-15T00:00:00.000Z");
      const result = formatUTCDateForDisplaySlash(utcDate);
      expect(result).toBe("2024/01/15");
    });

    it("一桁の月日を0埋めする", () => {
      const utcDate = new Date("2024-03-05T00:00:00.000Z");
      const result = formatUTCDateForDisplaySlash(utcDate);
      expect(result).toBe("2024/03/05");
    });
  });

  describe("utcToLocalDate", () => {
    it("UTC日付をローカル日付として作成する", () => {
      const utcDate = new Date("2024-01-15T00:00:00.000Z");
      const result = utcToLocalDate(utcDate);

      expect(result?.getFullYear()).toBe(2024);
      expect(result?.getMonth()).toBe(0); // 0ベース（1月）
      expect(result?.getDate()).toBe(15);
      expect(result?.getHours()).toBe(0);
      expect(result?.getMinutes()).toBe(0);
      expect(result?.getSeconds()).toBe(0);
    });

    it("undefinedやnullの場合はundefinedを返す", () => {
      expect(utcToLocalDate(undefined)).toBeUndefined();
      expect(utcToLocalDate(null)).toBeUndefined();
    });

    it("UTC時刻に関係なく同じローカル日付を作成する", () => {
      const utcDate1 = new Date("2024-01-15T00:00:00.000Z");
      const utcDate2 = new Date("2024-01-15T23:59:59.999Z");

      const result1 = utcToLocalDate(utcDate1);
      const result2 = utcToLocalDate(utcDate2);

      expect(result1?.getFullYear()).toBe(2024);
      expect(result1?.getMonth()).toBe(0);
      expect(result1?.getDate()).toBe(15);

      expect(result2?.getFullYear()).toBe(2024);
      expect(result2?.getMonth()).toBe(0);
      expect(result2?.getDate()).toBe(15);
    });
  });




  describe("formatUTCDateRelative", () => {
    beforeEach(() => {
      // 固定日時でテスト（2024-01-15）
      jest.useFakeTimers();
      jest.setSystemTime(new Date("2024-01-15T12:00:00.000Z"));
    });

    afterEach(() => {
      jest.useRealTimers();
    });

  });
});