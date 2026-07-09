import {
  progressPointX,
  buildProgressLinePoints,
  type ProgressLineTask,
  type ProgressLineRow,
} from "@/components/ganttv3/utils/progressLine";

// テスト用の線形 dateToX: エポック日数をそのままX(px)にする（1日=1px）
const DAY = 24 * 60 * 60 * 1000;
const dateToX = (d: Date): number => d.getTime() / DAY;

function task(
  startYmd: string,
  endYmd: string,
  progress: number,
  isMilestone = false,
): ProgressLineTask {
  return {
    startDate: new Date(`${startYmd}T00:00:00.000Z`),
    endDate: new Date(`${endYmd}T00:00:00.000Z`),
    progress,
    isMilestone,
  };
}

const todayMs = new Date("2024-01-10T00:00:00.000Z").getTime();
const todayX = dateToX(new Date(todayMs));

describe("progressPointX", () => {
  it("進行中タスクが予定通りの進捗なら基準線(todayX)上に乗る", () => {
    // 1/1〜1/11(10日)。1/10時点の予定進捗は 9/10=90%。実績90%なら達成日=1/10=基準日。
    const t = task("2024-01-01", "2024-01-11", 90);
    expect(progressPointX(t, todayMs, todayX, dateToX)).toBeCloseTo(todayX, 6);
  });

  it("進行中で遅れているタスクは基準線より左（X<todayX）へ張り出す", () => {
    // 1/1〜1/11、実績50% → 達成日=1/6。基準日1/10より過去なので左。
    const t = task("2024-01-01", "2024-01-11", 50);
    const x = progressPointX(t, todayMs, todayX, dateToX)!;
    expect(x).toBeLessThan(todayX);
    // 達成日1/6 と 基準日1/10 の差 = -4px
    expect(x).toBeCloseTo(todayX - 4, 6);
  });

  it("進行中で進んでいるタスクは基準線より右（X>todayX）へ張り出す", () => {
    // 1/1〜1/11、実績100%（前倒し完了）→ 達成日=1/11。基準日1/10より未来なので右。
    const t = task("2024-01-01", "2024-01-11", 100);
    const x = progressPointX(t, todayMs, todayX, dateToX)!;
    expect(x).toBeGreaterThan(todayX);
    expect(x).toBeCloseTo(todayX + 1, 6);
  });

  it("未着手の将来タスク(0%)は基準線上に乗る（右へ誤って張り出さない）", () => {
    // 1/20〜1/30、0%。基準日1/10はタスク開始前 → 基準点は開始日にクランプ、達成日=開始日 → 偏差0。
    const t = task("2024-01-20", "2024-01-30", 0);
    expect(progressPointX(t, todayMs, todayX, dateToX)).toBeCloseTo(todayX, 6);
  });

  it("完了済みの過去タスク(100%)は基準線上に乗る（左へ誤って張り出さない）", () => {
    // 1/1〜1/5、100%。基準日1/10はタスク終了後 → 基準点は終了日にクランプ、達成日=終了日 → 偏差0。
    const t = task("2024-01-01", "2024-01-05", 100);
    expect(progressPointX(t, todayMs, todayX, dateToX)).toBeCloseTo(todayX, 6);
  });

  it("将来タスクを前倒し着手していれば右へ張り出す", () => {
    // 1/20〜1/30(10日)、実績30% → 達成日=1/23。基準点=開始日1/20 → 偏差 +3px。
    const t = task("2024-01-20", "2024-01-30", 30);
    const x = progressPointX(t, todayMs, todayX, dateToX)!;
    expect(x).toBeCloseTo(todayX + 3, 6);
  });

  it("期限超過で未完了の過去タスクは左へ張り出す", () => {
    // 1/1〜1/5(4日)、実績50% → 達成日=1/3。基準点=終了日1/5 → 偏差 -2px。
    const t = task("2024-01-01", "2024-01-05", 50);
    const x = progressPointX(t, todayMs, todayX, dateToX)!;
    expect(x).toBeCloseTo(todayX - 2, 6);
  });

  it("マイルストーンは進捗点を持たない（null）", () => {
    const t = task("2024-01-10", "2024-01-10", 0, true);
    expect(progressPointX(t, todayMs, todayX, dateToX)).toBeNull();
  });

  it("ゼロ期間（start===end）は進捗点を持たない（null）", () => {
    const t = task("2024-01-10", "2024-01-10", 50);
    expect(progressPointX(t, todayMs, todayX, dateToX)).toBeNull();
  });

  it("非有限な進捗率（NaN）は進捗点を持たない（null）", () => {
    const t = task("2024-01-01", "2024-01-11", Number.NaN);
    expect(progressPointX(t, todayMs, todayX, dateToX)).toBeNull();
  });

  it("進捗率は0-100にクランプされる", () => {
    const over = task("2024-01-01", "2024-01-11", 150);
    const under = task("2024-01-01", "2024-01-11", -20);
    // 150%→100%クランプ=達成日1/11、-20%→0%クランプ=達成日1/1
    expect(progressPointX(over, todayMs, todayX, dateToX)).toBeCloseTo(
      dateToX(new Date("2024-01-11T00:00:00.000Z")),
      6,
    );
    expect(progressPointX(under, todayMs, todayX, dateToX)).toBeCloseTo(
      dateToX(new Date("2024-01-01T00:00:00.000Z")),
      6,
    );
  });
});

describe("buildProgressLinePoints", () => {
  const rowOf = (t: ProgressLineTask, centerY: number): ProgressLineRow => ({
    task: t,
    centerY,
  });

  it("先頭/末尾は基準日ラインの端点、間は各タスクの進捗点を通る", () => {
    const rows = [
      rowOf(task("2024-01-01", "2024-01-11", 50), 10), // 遅れ → 左
      rowOf(task("2024-01-01", "2024-01-11", 100), 30), // 前倒し → 右
    ];
    const points = buildProgressLinePoints(
      rows,
      todayMs,
      todayX,
      dateToX,
      0,
      100,
    );
    expect(points).toHaveLength(4);
    expect(points[0]).toEqual({ x: todayX, y: 0 });
    expect(points[3]).toEqual({ x: todayX, y: 100 });
    expect(points[1].y).toBe(10);
    expect(points[1].x).toBeLessThan(todayX);
    expect(points[2].y).toBe(30);
    expect(points[2].x).toBeGreaterThan(todayX);
  });

  it("有効な行の間にスキップ行が挟まっても、両端の有効点のみを通る", () => {
    const rows = [
      rowOf(task("2024-01-01", "2024-01-11", 50), 10), // 有効
      rowOf(task("2024-01-10", "2024-01-10", 0, true), 20), // マイルストーン→スキップ
      rowOf(task("2024-01-01", "2024-01-11", 100), 30), // 有効
    ];
    const points = buildProgressLinePoints(
      rows,
      todayMs,
      todayX,
      dateToX,
      0,
      100,
    );
    // 端点2 + 有効タスク2 = 4頂点。スキップ行のY(20)は通らない。
    expect(points).toHaveLength(4);
    expect(points.map((p) => p.y)).toEqual([0, 10, 30, 100]);
  });

  it("マイルストーン/ゼロ期間の行はスキップする（端点のみ残る）", () => {
    const rows = [
      rowOf(task("2024-01-10", "2024-01-10", 0, true), 10),
      rowOf(task("2024-01-10", "2024-01-10", 50), 30),
    ];
    const points = buildProgressLinePoints(
      rows,
      todayMs,
      todayX,
      dateToX,
      0,
      100,
    );
    // 進捗点は無くなり、端点2つのみ（today上の縦線）
    expect(points).toEqual([
      { x: todayX, y: 0 },
      { x: todayX, y: 100 },
    ]);
  });

  it("行が空でも端点2つを返す", () => {
    const points = buildProgressLinePoints([], todayMs, todayX, dateToX, 5, 95);
    expect(points).toEqual([
      { x: todayX, y: 5 },
      { x: todayX, y: 95 },
    ]);
  });
});
