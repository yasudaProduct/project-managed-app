import {
  toDateInputValue,
  fromDateInputValue,
} from "@/components/ganttv3/utils/dateInput";

describe("toDateInputValue", () => {
  it("UTC基準で YYYY-MM-DD を返す", () => {
    expect(toDateInputValue(new Date("2024-03-09T00:00:00.000Z"))).toBe(
      "2024-03-09",
    );
  });

  it("undefined は空文字", () => {
    expect(toDateInputValue(undefined)).toBe("");
  });
});

describe("fromDateInputValue", () => {
  it("YYYY-MM-DD を UTC 0時の Date に変換", () => {
    const d = fromDateInputValue("2024-03-09");
    expect(d?.toISOString()).toBe("2024-03-09T00:00:00.000Z");
  });

  it("空文字は null", () => {
    expect(fromDateInputValue("")).toBeNull();
  });

  it("往復で値が保たれる", () => {
    const iso = "2024-12-25";
    expect(toDateInputValue(fromDateInputValue(iso)!)).toBe(iso);
  });
});
