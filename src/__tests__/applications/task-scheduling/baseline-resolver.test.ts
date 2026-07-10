import { resolveBaselineDate } from "@/applications/task-scheduling/baseline-resolver";

describe("resolveBaselineDate", () => {
  const projectStart = new Date(2026, 0, 10);
  const now = new Date(2026, 5, 17, 13, 30);

  test("PROJECT_START はプロジェクト開始日", () => {
    expect(resolveBaselineDate("PROJECT_START", projectStart, now)).toEqual(
      projectStart
    );
  });

  test("TODAY は今日の0時", () => {
    expect(resolveBaselineDate("TODAY", projectStart, now)).toEqual(
      new Date(2026, 5, 17)
    );
  });

  test("CUSTOM は指定ISOを解釈する", () => {
    const r = resolveBaselineDate(
      "CUSTOM",
      projectStart,
      now,
      "2026-03-01T00:00:00.000Z"
    );
    expect(r.getTime()).toBe(new Date("2026-03-01T00:00:00.000Z").getTime());
  });

  test("CUSTOM でISO未指定はエラー", () => {
    expect(() => resolveBaselineDate("CUSTOM", projectStart, now)).toThrow();
  });
});
