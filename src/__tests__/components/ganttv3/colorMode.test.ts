import {
  getPhaseColor,
  calcForecastEnd,
  PLAN_COLOR,
} from "@/components/ganttv3/colorMode";
import { Task, GanttPhase } from "@/components/ganttv3/gantt";

const baseTask = (overrides: Partial<Task> = {}): Task => ({
  id: "1",
  name: "タスク",
  startDate: new Date("2024-01-01T00:00:00Z"),
  endDate: new Date("2024-01-11T00:00:00Z"), // 予定期間 10日
  duration: 10,
  color: "#000000",
  isMilestone: false,
  progress: 0,
  predecessors: [],
  level: 0,
  isManuallyScheduled: true,
  category: "設計",
  status: "IN_PROGRESS",
  yoteiKosu: 10,
  ...overrides,
});

const phases: GanttPhase[] = [
  { id: "10", name: "設計", color: "#123456" },
  { id: "20", name: "開発", color: "#abcdef" },
];

describe("colorMode helpers", () => {
  describe("getPhaseColor", () => {
    it("タスクのフェーズに対応する色を返す", () => {
      const task = baseTask({ category: "設計" });
      expect(getPhaseColor(task, phases)).toBe("#123456");
    });

    it("フェーズが見つからない場合はタスク固有色にフォールバックする", () => {
      const task = baseTask({ category: "未分類", color: "#999999" });
      expect(getPhaseColor(task, phases)).toBe("#999999");
    });
  });

  describe("calcForecastEnd", () => {
    it("完了済みタスクは見通しを算出しない", () => {
      const task = baseTask({ status: "COMPLETED", forecastKosu: 20 });
      expect(calcForecastEnd(task)).toBeNull();
    });

    it("見通し工数が無い場合は算出しない", () => {
      const task = baseTask({ forecastKosu: undefined });
      expect(calcForecastEnd(task)).toBeNull();
    });

    it("予定工数が無い場合は算出しない", () => {
      const task = baseTask({ forecastKosu: 20, yoteiKosu: 0 });
      expect(calcForecastEnd(task)).toBeNull();
    });

    it("見通し工数/予定工数の比率で予定期間をスケールする", () => {
      // 予定10日 × (見通し20 / 予定10) = 20日
      const task = baseTask({ forecastKosu: 20, yoteiKosu: 10 });
      const result = calcForecastEnd(task);
      expect(result).not.toBeNull();
      expect(result!.start.getTime()).toBe(task.startDate.getTime());
      expect(result!.end.toISOString().split("T")[0]).toBe("2024-01-21");
    });

    it("実績開始日があれば起点に使う", () => {
      const task = baseTask({
        forecastKosu: 10,
        yoteiKosu: 10,
        jissekiStart: new Date("2024-01-05T00:00:00Z"),
      });
      const result = calcForecastEnd(task);
      expect(result).not.toBeNull();
      // 起点は実績開始日、比率1.0なので予定10日ぶん = 1/15
      expect(result!.start.toISOString().split("T")[0]).toBe("2024-01-05");
      expect(result!.end.toISOString().split("T")[0]).toBe("2024-01-15");
    });
  });

  it("PLAN_COLOR が定義されている", () => {
    expect(PLAN_COLOR).toBeTruthy();
  });
});
