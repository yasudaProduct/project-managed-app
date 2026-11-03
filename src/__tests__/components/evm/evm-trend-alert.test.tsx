import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { EvmTrendAlert } from "@/components/evm/evm-trend-alert";
import type { EvmTrendDto } from "@/applications/trend/evm-trend-application-service";

const makeTrend = (overrides: Partial<EvmTrendDto> = {}): EvmTrendDto => ({
  progressReviewCycle: "WEEKLY",
  periods: 3,
  points: [
    { date: "2026-10-11T00:00:00.000Z", spi: 1.0, cpi: 0.95 },
    { date: "2026-10-18T00:00:00.000Z", spi: 0.95, cpi: 0.96 },
    { date: "2026-10-25T00:00:00.000Z", spi: 0.92, cpi: 0.94 },
    { date: "2026-11-01T00:00:00.000Z", spi: 0.88, cpi: 0.95 },
  ],
  isSpiDeteriorating: true,
  isCpiDeteriorating: false,
  ...overrides,
});

describe("EvmTrendAlert", () => {
  it("悪化している指標と、各確認日の値の推移を表示する", () => {
    render(<EvmTrendAlert trend={makeTrend()} />);

    expect(screen.getByText(/SPIが週次で3期連続して悪化しています/)).toBeInTheDocument();
    expect(screen.getByText(/1\.000 → 0\.950 → 0\.920 → 0\.880/)).toBeInTheDocument();
    expect(screen.queryByText(/CPIが/)).not.toBeInTheDocument();
  });

  it("悪化していなければ何も表示しない", () => {
    const { container } = render(
      <EvmTrendAlert trend={makeTrend({ isSpiDeteriorating: false })} />
    );

    expect(container).toBeEmptyDOMElement();
  });
});
