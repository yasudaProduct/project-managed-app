import React from "react";
import { render, screen, within } from "@testing-library/react";
import "@testing-library/jest-dom";
import { EvmBreakdownTable } from "@/components/evm/evm-breakdown-table";
import type { EvmBreakdownRow } from "@/applications/evm/evm-dashboard-dto";

/**
 * EVM内訳テーブルの表示検証。
 * 比率（SPI/CPI）だけでなく、影響の大きさを示すSV/CVを列として表示する。
 */

const makeRow = (overrides: Partial<EvmBreakdownRow>): EvmBreakdownRow => ({
  key: "phase:1",
  name: "設計",
  taskCount: 1,
  pv: 100,
  ev: 50,
  ac: 30,
  bac: 100,
  sv: -50,
  cv: 20,
  spi: 0.5,
  cpi: 50 / 30,
  ...overrides,
});

describe("EvmBreakdownTable", () => {
  it("SV・CV列を表示し、マイナスは赤字にする", () => {
    render(
      <EvmBreakdownTable
        title="フェーズ別内訳"
        rows={[makeRow({})]}
        calculationMode="hours"
      />
    );

    expect(screen.getByRole("columnheader", { name: "SV" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "CV" })).toBeInTheDocument();

    const row = screen.getByRole("row", { name: /設計/ });
    const svCell = within(row).getByText("-50.0h");
    expect(svCell).toHaveClass("text-red-600");
    expect(within(row).getByText("20.0h")).not.toHaveClass("text-red-600");
  });

  it("並び順の選択肢を表示する（既定は元の順）", () => {
    render(
      <EvmBreakdownTable
        title="フェーズ別内訳"
        rows={[
          makeRow({ key: "a", name: "設計", sv: -10 }),
          makeRow({ key: "b", name: "実装", sv: -40 }),
        ]}
        calculationMode="hours"
      />
    );

    expect(
      screen.getByRole("combobox", { name: "フェーズ別内訳の並び順" })
    ).toHaveTextContent("既定の順");
    const names = screen
      .getAllByRole("row")
      .slice(1)
      .map((r) => within(r).getAllByRole("cell")[0].textContent);
    expect(names).toEqual(["設計", "実装"]);
  });
});
