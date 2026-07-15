import { ExternalLoadAwareCalendar } from "@/domains/task-scheduling/external-load-aware-calendar";
import type { WorkingCalendar } from "@/domains/task-scheduling/working-calendar-walker";

// 平日hours、土日0hの物理カレンダー(rate=1相当: 標準−個人予定)
const physical = (hours: number): WorkingCalendar => ({
  getAvailableHours: (d: Date) =>
    d.getDay() === 0 || d.getDay() === 6 ? 0 : hours,
});

const MON = new Date(2026, 5, 15); // 月曜
const SAT = new Date(2026, 5, 20); // 土曜

const external = (entries: [string, number][]) => new Map(entries);

describe("ExternalLoadAwareCalendar", () => {
  test("外部負荷が参画率外の枠に収まる場合、取り分(標準×率)は満額使える", () => {
    // 物理7.5h・取り分3.75h(率0.5)・外部2h → 外部は率外の3.75hから消費される
    const cal = new ExternalLoadAwareCalendar({
      physicalCalendar: physical(7.5),
      rateCapHours: 3.75,
      externalDailyHours: external([["2026-06-15", 2]]),
    });
    expect(cal.getAvailableHours(MON)).toBe(3.75);
  });

  test("0.5/0.5の掛け持ちでも自分の取り分は確保される", () => {
    // 他PJが3.75h占有 → 物理残3.75h = 取り分ちょうど
    const cal = new ExternalLoadAwareCalendar({
      physicalCalendar: physical(7.5),
      rateCapHours: 3.75,
      externalDailyHours: external([["2026-06-15", 3.75]]),
    });
    expect(cal.getAvailableHours(MON)).toBe(3.75);
  });

  test("物理残が取り分を下回る場合は物理残が上限になる", () => {
    // 外部5h → 物理残2.5h < 取り分3.75h
    const cal = new ExternalLoadAwareCalendar({
      physicalCalendar: physical(7.5),
      rateCapHours: 3.75,
      externalDailyHours: external([["2026-06-15", 5]]),
    });
    expect(cal.getAvailableHours(MON)).toBe(2.5);
  });

  test("外部負荷が物理残以上なら0", () => {
    const cal = new ExternalLoadAwareCalendar({
      physicalCalendar: physical(7.5),
      rateCapHours: 3.75,
      externalDailyHours: external([["2026-06-15", 8]]),
    });
    expect(cal.getAvailableHours(MON)).toBe(0);
  });

  test("外部負荷が無い日は min(取り分, 物理残)", () => {
    const cal = new ExternalLoadAwareCalendar({
      physicalCalendar: physical(7.5),
      rateCapHours: 3.75,
      externalDailyHours: external([]),
    });
    expect(cal.getAvailableHours(MON)).toBe(3.75);
  });

  test("非稼働日(物理0)は外部負荷に関わらず0", () => {
    const cal = new ExternalLoadAwareCalendar({
      physicalCalendar: physical(7.5),
      rateCapHours: 3.75,
      externalDailyHours: external([["2026-06-20", 2]]),
    });
    expect(cal.getAvailableHours(SAT)).toBe(0);
  });

  test("個人予定で物理残が減った日: min(取り分, 物理残−外部)", () => {
    // 物理5.5h(個人予定2h控除後)・外部2h → min(3.75, 3.5) = 3.5
    const cal = new ExternalLoadAwareCalendar({
      physicalCalendar: physical(5.5),
      rateCapHours: 3.75,
      externalDailyHours: external([["2026-06-15", 2]]),
    });
    expect(cal.getAvailableHours(MON)).toBe(3.5);
  });

  test("参画率1.0は従来(物理残−外部)と一致する", () => {
    const cal = new ExternalLoadAwareCalendar({
      physicalCalendar: physical(7.5),
      rateCapHours: 7.5,
      externalDailyHours: external([["2026-06-15", 3.75]]),
    });
    expect(cal.getAvailableHours(MON)).toBe(3.75);
  });

  test("参画率0(取り分0)は常に0", () => {
    const cal = new ExternalLoadAwareCalendar({
      physicalCalendar: physical(7.5),
      rateCapHours: 0,
      externalDailyHours: external([]),
    });
    expect(cal.getAvailableHours(MON)).toBe(0);
  });
});
