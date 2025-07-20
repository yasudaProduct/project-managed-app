import {
  formatUTCDateForDisplay,
  formatUTCDateForDisplaySlash,
  utcToLocalDate,
  formatUTCDateForDatePicker,
  formatUTCDateForJapanese,
  formatUTCDateRelative,
  debugDateDisplay,
} from "@/lib/date-display-utils";

describe("date-display-utils", () => {
  describe("formatUTCDateForDisplay", () => {
    it("UTC日付をYYYY-MM-DD形式で表示する", () => {
      const utcDate = new Date("2024-01-15T00:00:00.000Z");
      const result = formatUTCDateForDisplay(utcDate);
      expect(result).toBe("2024-01-15");
    });

    it("undefinedやnullの場合は空文字を返す", () => {
      expect(formatUTCDateForDisplay(undefined)).toBe("");
      expect(formatUTCDateForDisplay(null)).toBe("");
    });

    it("UTC時刻に関係なく同じ日付を表示する", () => {
      const utcDate1 = new Date("2024-01-15T00:00:00.000Z");
      const utcDate2 = new Date("2024-01-15T23:59:59.999Z");
      
      expect(formatUTCDateForDisplay(utcDate1)).toBe("2024-01-15");
      expect(formatUTCDateForDisplay(utcDate2)).toBe("2024-01-15");
    });
  });

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

  describe("formatUTCDateForDatePicker", () => {
    it("DatePicker用にYYYY-MM-DD形式で返す", () => {
      const utcDate = new Date("2024-01-15T00:00:00.000Z");
      const result = formatUTCDateForDatePicker(utcDate);
      expect(result).toBe("2024-01-15");
    });
  });

  describe("formatUTCDateForJapanese", () => {
    it("日本語形式（YYYY年MM月DD日）で表示する", () => {
      const utcDate = new Date("2024-01-15T00:00:00.000Z");
      const result = formatUTCDateForJapanese(utcDate);
      expect(result).toBe("2024年01月15日");
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

    it("今日の場合は「今日」を返す", () => {
      const utcDate = new Date("2024-01-15T00:00:00.000Z");
      const result = formatUTCDateRelative(utcDate);
      expect(result).toBe("今日");
    });

    it("明日の場合は「明日」を返す", () => {
      const utcDate = new Date("2024-01-16T00:00:00.000Z");
      const result = formatUTCDateRelative(utcDate);
      expect(result).toBe("明日");
    });

    it("昨日の場合は「昨日」を返す", () => {
      const utcDate = new Date("2024-01-14T00:00:00.000Z");
      const result = formatUTCDateRelative(utcDate);
      expect(result).toBe("昨日");
    });

    it("N日後の場合は「N日後」を返す", () => {
      const utcDate = new Date("2024-01-18T00:00:00.000Z");
      const result = formatUTCDateRelative(utcDate);
      expect(result).toBe("3日後");
    });

    it("N日前の場合は「N日前」を返す", () => {
      const utcDate = new Date("2024-01-12T00:00:00.000Z");
      const result = formatUTCDateRelative(utcDate);
      expect(result).toBe("3日前");
    });
  });

  describe("debugDateDisplay", () => {
    it("UTC日付とローカル表示の両方を表示する", () => {
      const utcDate = new Date("2024-01-15T00:00:00.000Z");
      const result = debugDateDisplay(utcDate);
      expect(result).toBe("UTC: 2024-01-15T00:00:00.000Z → Local Display: 2024-01-15");
    });

    it("日付がない場合は「No date」を返す", () => {
      expect(debugDateDisplay(null)).toBe("No date");
      expect(debugDateDisplay(undefined)).toBe("No date");
    });
  });
});