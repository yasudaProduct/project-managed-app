import { calculateSteadyTaskForecast } from "@/domains/forecast/steady-task-forecast-service";

describe("calculateSteadyTaskForecast", () => {
  // 予定100h / 期間20営業日 / 経過8営業日 / 実績48h を共通条件とする
  const base = {
    plannedHours: 100,
    actualHours: 48,
    totalWorkingDays: 20,
    elapsedWorkingDays: 8,
  };

  describe("PLANNED（予定ベース）", () => {
    test("見通し = max(予定, 実績)、日次ペース = 予定 ÷ 総稼働日数", () => {
      const r = calculateSteadyTaskForecast("PLANNED", base);
      expect(r.forecastHours).toBe(100);
      expect(r.dailyRate).toBeCloseTo(5, 6); // 100 / 20
    });

    test("実績が予定を上回る場合は実績を採用", () => {
      const r = calculateSteadyTaskForecast("PLANNED", {
        ...base,
        actualHours: 130,
      });
      expect(r.forecastHours).toBe(130);
    });
  });

  describe("ACTUAL_PACE（実績ペース・保守的）", () => {
    test("見通し = (実績 ÷ 経過稼働日数) × 総稼働日数", () => {
      const r = calculateSteadyTaskForecast("ACTUAL_PACE", base);
      // 48 / 8 = 6h/日, 6 × 20 = 120h
      expect(r.forecastHours).toBeCloseTo(120, 6);
      expect(r.dailyRate).toBeCloseTo(6, 6);
    });

    test("期間が満了していれば見通しは実績に一致する（経過=総）", () => {
      const r = calculateSteadyTaskForecast("ACTUAL_PACE", {
        ...base,
        elapsedWorkingDays: 20,
      });
      expect(r.forecastHours).toBeCloseTo(48, 6);
    });

    test("実績なしは PLANNED にフォールバック", () => {
      const r = calculateSteadyTaskForecast("ACTUAL_PACE", {
        ...base,
        actualHours: 0,
      });
      expect(r.forecastHours).toBe(100);
      expect(r.dailyRate).toBeCloseTo(5, 6);
    });

    test("経過0日は PLANNED にフォールバック", () => {
      const r = calculateSteadyTaskForecast("ACTUAL_PACE", {
        ...base,
        elapsedWorkingDays: 0,
      });
      expect(r.forecastHours).toBe(100);
    });
  });

  describe("PLANNED_PACE（予定ペース・楽観的）", () => {
    test("見通し = 実績 + 残り稼働日数 × (予定 ÷ 総稼働日数)", () => {
      const r = calculateSteadyTaskForecast("PLANNED_PACE", base);
      // 残 = 20 - 8 = 12日, 予定ペース = 100/20 = 5h/日, 48 + 12*5 = 108h
      expect(r.forecastHours).toBeCloseTo(108, 6);
      expect(r.dailyRate).toBeCloseTo(5, 6);
    });

    test("期間満了時は見通し = 実績（残り0日）", () => {
      const r = calculateSteadyTaskForecast("PLANNED_PACE", {
        ...base,
        actualHours: 90,
        elapsedWorkingDays: 20,
      });
      expect(r.forecastHours).toBeCloseTo(90, 6);
    });
  });

  describe("境界条件", () => {
    test("総稼働日数0（期間なし）は max(予定, 実績)・日次ペース0", () => {
      for (const mode of ["PLANNED", "ACTUAL_PACE", "PLANNED_PACE"] as const) {
        const r = calculateSteadyTaskForecast(mode, {
          plannedHours: 100,
          actualHours: 30,
          totalWorkingDays: 0,
          elapsedWorkingDays: 0,
        });
        expect(r.forecastHours).toBe(100);
        expect(r.dailyRate).toBe(0);
      }
    });

    test("経過が総を超える場合は総にクランプ（実績に収束）", () => {
      const r = calculateSteadyTaskForecast("ACTUAL_PACE", {
        plannedHours: 100,
        actualHours: 60,
        totalWorkingDays: 20,
        elapsedWorkingDays: 30,
      });
      expect(r.forecastHours).toBeCloseTo(60, 6);
    });

    test("見通しは常に実績以上（不変条件）", () => {
      const r = calculateSteadyTaskForecast("ACTUAL_PACE", {
        plannedHours: 10,
        actualHours: 80,
        totalWorkingDays: 20,
        elapsedWorkingDays: 8,
      });
      expect(r.forecastHours).toBeGreaterThanOrEqual(80);
    });

    test("負値は0として扱う", () => {
      const r = calculateSteadyTaskForecast("PLANNED", {
        plannedHours: -5,
        actualHours: -10,
        totalWorkingDays: -3,
        elapsedWorkingDays: -1,
      });
      expect(r.forecastHours).toBe(0);
      expect(r.dailyRate).toBe(0);
    });
  });
});
