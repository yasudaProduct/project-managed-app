import { analyzeDeadlines } from "@/domains/task-scheduling/schedule-deadline-analysis";

const d = (y: number, m: number, day: number) => new Date(y, m - 1, day);

describe("analyzeDeadlines", () => {
  test("終了差分: 算出が現行予定より後ろなら + 、前なら −", () => {
    const late = analyzeDeadlines({
      computedStart: d(2024, 6, 5),
      computedEnd: d(2024, 6, 14),
      currentStart: d(2024, 6, 1),
      currentEnd: d(2024, 6, 10),
      milestones: [],
    });
    expect(late.startDiffDays).toBe(4);
    expect(late.endDiffDays).toBe(4);

    const early = analyzeDeadlines({
      computedStart: d(2024, 6, 1),
      computedEnd: d(2024, 6, 8),
      currentStart: d(2024, 6, 1),
      currentEnd: d(2024, 6, 10),
      milestones: [],
    });
    expect(early.endDiffDays).toBe(-2);
  });

  test("基準終了超過: 算出終了が基準終了を超えると baselineEndDiffDays > 0", () => {
    const r = analyzeDeadlines({
      computedEnd: d(2024, 6, 14),
      baselineEnd: d(2024, 6, 10),
      milestones: [],
    });
    expect(r.baselineEndDiffDays).toBe(4);
  });

  test("基準終了内なら baselineEndDiffDays <= 0", () => {
    const r = analyzeDeadlines({
      computedEnd: d(2024, 6, 8),
      baselineEnd: d(2024, 6, 10),
      milestones: [],
    });
    expect(r.baselineEndDiffDays).toBe(-2);
  });

  test("プロジェクト終了超過", () => {
    const r = analyzeDeadlines({
      computedEnd: d(2024, 6, 30),
      projectEnd: d(2024, 6, 25),
      milestones: [],
    });
    expect(r.projectEndDiffDays).toBe(5);
  });

  test("マイルストーン超過: committedEnd<=M<computedEnd を間に合わないとする", () => {
    const r = analyzeDeadlines({
      computedEnd: d(2024, 6, 25),
      // committedEnd = baselineEnd(6/20)
      baselineEnd: d(2024, 6, 20),
      milestones: [
        { name: "結合試験開始", date: d(2024, 6, 22) }, // 20<=22<25 → miss
        { name: "リリース", date: d(2024, 6, 30) }, // 22<=30 だが 30<25 でない → ok
        { name: "設計完了", date: d(2024, 6, 18) }, // 18 < 20(committed) → ok
      ],
    });
    expect(r.missedMilestones.map((m) => m.name)).toEqual(["結合試験開始"]);
  });

  test("committedEnd が無ければマイルストーン判定はスキップ", () => {
    const r = analyzeDeadlines({
      computedEnd: d(2024, 6, 25),
      // baselineEnd も currentEnd も無し
      milestones: [{ name: "M", date: d(2024, 6, 22) }],
    });
    expect(r.missedMilestones).toEqual([]);
  });

  test("算出終了が無い（未算出/エラー）なら全 diff は undefined", () => {
    const r = analyzeDeadlines({
      currentEnd: d(2024, 6, 10),
      baselineEnd: d(2024, 6, 10),
      projectEnd: d(2024, 6, 25),
      milestones: [{ name: "M", date: d(2024, 6, 5) }],
    });
    expect(r.startDiffDays).toBeUndefined();
    expect(r.endDiffDays).toBeUndefined();
    expect(r.baselineEndDiffDays).toBeUndefined();
    expect(r.projectEndDiffDays).toBeUndefined();
    expect(r.missedMilestones).toEqual([]);
  });
});
