import {
  localDateStringToUTC,
  localDateToUTCStartOfDay,
  localDateToUTCEndOfDay,
  isUTCMidnight,
  ensureUTC,
  fromDatabase,
} from "@/lib/date-utils";

describe("date-utils", () => {
  describe("localDateStringToUTC", () => {
    it("YYYY-MM-DD形式の文字列をUTC開始時刻に変換する", () => {
      const result = localDateStringToUTC("2024-01-15");
      expect(result.toISOString()).toBe("2024-01-15T00:00:00.000Z");
      expect(result.getUTCHours()).toBe(0);
      expect(result.getUTCMinutes()).toBe(0);
      expect(result.getUTCSeconds()).toBe(0);
    });

    it("YYYY/MM/DD形式の文字列をUTC開始時刻に変換する", () => {
      const result = localDateStringToUTC("2024/01/15");
      expect(result.toISOString()).toBe("2024-01-15T00:00:00.000Z");
    });
  });

  describe("localDateToUTCStartOfDay", () => {
    it("ローカル日付をUTC開始時刻に変換する", () => {
      // JST 2024-01-15 15:30:00
      const localDate = new Date(2024, 0, 15, 15, 30, 0);
      const result = localDateToUTCStartOfDay(localDate);
      
      expect(result.toISOString()).toBe("2024-01-15T00:00:00.000Z");
      expect(result.getUTCDate()).toBe(15);
      expect(result.getUTCHours()).toBe(0);
    });

    it("月末の日付でも正しく動作する", () => {
      const localDate = new Date(2024, 0, 31, 23, 59, 59);
      const result = localDateToUTCStartOfDay(localDate);
      
      expect(result.toISOString()).toBe("2024-01-31T00:00:00.000Z");
    });
  });

  describe("localDateToUTCEndOfDay", () => {
    it("ローカル日付をUTC終了時刻に変換する", () => {
      const localDate = new Date(2024, 0, 15, 10, 0, 0);
      const result = localDateToUTCEndOfDay(localDate);
      
      expect(result.toISOString()).toBe("2024-01-15T23:59:59.999Z");
      expect(result.getUTCDate()).toBe(15);
      expect(result.getUTCHours()).toBe(23);
      expect(result.getUTCMinutes()).toBe(59);
      expect(result.getUTCSeconds()).toBe(59);
      expect(result.getUTCMilliseconds()).toBe(999);
    });
  });

  describe("isUTCMidnight", () => {
    it("UTC 00:00:00の場合はtrueを返す", () => {
      const date = new Date("2024-01-15T00:00:00.000Z");
      expect(isUTCMidnight(date)).toBe(true);
    });

    it("UTC 00:00:00でない場合はfalseを返す", () => {
      const date = new Date("2024-01-15T00:00:01.000Z");
      expect(isUTCMidnight(date)).toBe(false);
    });

    it("ローカル真夜中でもUTCでない場合はfalseを返す", () => {
      // JST 2024-01-15 00:00:00 = UTC 2024-01-14 15:00:00
      const date = new Date(2024, 0, 15, 0, 0, 0);
      expect(isUTCMidnight(date)).toBe(false);
    });
  });

  describe("ensureUTC", () => {
    it("文字列日付をUTC開始時刻に変換する", () => {
      const result = ensureUTC("2024-01-15");
      expect(result?.toISOString()).toBe("2024-01-15T00:00:00.000Z");
    });

    it("すでにUTC 00:00:00の場合はそのまま返す", () => {
      const utcDate = new Date("2024-01-15T00:00:00.000Z");
      const result = ensureUTC(utcDate);
      expect(result?.toISOString()).toBe("2024-01-15T00:00:00.000Z");
    });

    it("ローカル日付をUTC開始時刻に変換する", () => {
      const localDate = new Date(2024, 0, 15, 15, 30, 0);
      const result = ensureUTC(localDate);
      expect(result?.toISOString()).toBe("2024-01-15T00:00:00.000Z");
    });

    it("undefinedの場合はundefinedを返す", () => {
      expect(ensureUTC(undefined)).toBeUndefined();
    });
  });

  describe("fromDatabase", () => {
    it("Date型をそのまま返す", () => {
      const date = new Date("2024-01-15T00:00:00.000Z");
      const result = fromDatabase(date);
      expect(result).toBe(date);
    });

    it("nullの場合はundefinedを返す", () => {
      const result = fromDatabase(null);
      expect(result).toBeUndefined();
    });
  });
});