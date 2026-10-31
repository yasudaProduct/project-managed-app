import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { EvmComparisonCard } from "@/components/evm/evm-comparison-card";
import type { EvmMetricsData } from "@/applications/evm/evm-dashboard-dto";

const makeMetrics = (overrides: Partial<EvmMetricsData> = {}): EvmMetricsData => ({
  date: "2026-10-31T00:00:00.000Z",
  pv_base: 100,
  pv: 100,
  ev: 88,
  ac: 100,
  bac: 200,
  sv: -12,
  cv: -12,
  spi: 0.88,
  cpi: 0.88,
  tcpi: 112 / 100,
  eac: 227,
  etc: 127,
  vac: -27,
  completionRate: 44,
  healthStatus: "warning",
  calculationMode: "hours",
  progressMethod: "SELF_REPORTED",
  forecastMethod: "CPI_ONLY",
  healthyThreshold: 0.9,
  warningThreshold: 0.8,
  formattedPv: "100.0h",
  formattedEv: "88.0h",
  formattedAc: "100.0h",
  formattedBac: "200.0h",
  isPredicted: false,
  ...overrides,
});

describe("EvmComparisonCard", () => {
  it("前回の確認日と、各指標の前回値・現在値・変化を表示する", () => {
    render(
      <EvmComparisonCard
        current={makeMetrics()}
        previous={makeMetrics({
          date: "2026-10-24T00:00:00.000Z",
          spi: 0.92,
          cpi: 0.9,
          sv: -5,
          cv: -6,
          completionRate: 38,
        })}
      />
    );

    expect(screen.getByText(/前回（10\/24/)).toBeInTheDocument();
    const spiRow = screen.getByRole("row", { name: /SPI/ });
    expect(spiRow).toHaveTextContent("0.920");
    expect(spiRow).toHaveTextContent("0.880");
    expect(spiRow).toHaveTextContent("-0.040");
    const svRow = screen.getByRole("row", { name: /SV/ });
    expect(svRow).toHaveTextContent("-7.0h");
    const rateRow = screen.getByRole("row", { name: /出来高率/ });
    expect(rateRow).toHaveTextContent("+6.0pt");
  });

  it("前回値がnull（未定義）の指標は変化を「—」にする", () => {
    render(
      <EvmComparisonCard
        current={makeMetrics()}
        previous={makeMetrics({ date: "2026-10-24T00:00:00.000Z", cpi: null })}
      />
    );

    const cpiRow = screen.getByRole("row", { name: /CPI/ });
    expect(cpiRow).toHaveTextContent("—");
  });
});
