import {
  PHASE_COLOR_PALETTE,
  phaseColor,
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
