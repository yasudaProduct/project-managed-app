import {
  PHASE_COLOR_PALETTE,
  PLAN_ACTUAL_FORECAST_COLORS,
  phaseColor,
  resolveBarColor,
} from "@/components/ganttv3/utils/phase-colors";

describe("phaseColor", () => {
  it("インデックスに対応するパレット色を返す", () => {
    expect(phaseColor(0)).toBe(PHASE_COLOR_PALETTE[0]);
    expect(phaseColor(9)).toBe(PHASE_COLOR_PALETTE[9]);
  });

  it("パレット長を超えたインデックスは循環する", () => {
    const len = PHASE_COLOR_PALETTE.length;
    expect(phaseColor(len)).toBe(phaseColor(0));
    expect(phaseColor(len * 2 + 3)).toBe(phaseColor(3));
  });

  it("パレットは全て #rrggbb 形式", () => {
    PHASE_COLOR_PALETTE.forEach((c) => {
      expect(c).toMatch(/^#[0-9a-f]{6}$/);
    });
  });
});

describe("resolveBarColor", () => {
  const task = { color: "#123456", isMilestone: false };

  it("phase モードでは task.color をそのまま返す", () => {
    expect(resolveBarColor(task, "phase", "planned")).toBe("#123456");
    expect(resolveBarColor(task, "phase", "actual")).toBe("#123456");
    expect(resolveBarColor(task, "phase", "forecast")).toBe("#123456");
  });

  it("planActualForecast モードでは種別ごとの固定色を返す", () => {
    expect(resolveBarColor(task, "planActualForecast", "planned")).toBe(
      PLAN_ACTUAL_FORECAST_COLORS.planned,
    );
    expect(resolveBarColor(task, "planActualForecast", "actual")).toBe(
      PLAN_ACTUAL_FORECAST_COLORS.actual,
    );
    expect(resolveBarColor(task, "planActualForecast", "forecast")).toBe(
      PLAN_ACTUAL_FORECAST_COLORS.forecast,
    );
  });

  it("マイルストーンは色分けモードに関わらず常に task.color", () => {
    const milestone = { color: "#EF4444", isMilestone: true };
    expect(resolveBarColor(milestone, "planActualForecast", "planned")).toBe(
      "#EF4444",
    );
  });

  it("barType 省略時は既定で planned として解決する", () => {
    expect(resolveBarColor(task, "planActualForecast")).toBe(
      PLAN_ACTUAL_FORECAST_COLORS.planned,
    );
  });
});
