import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { EvmBufferCard } from "@/components/evm/evm-buffer-card";

const status = (overrides = {}) => ({
  bufferAmount: 20,
  consumedAmount: 10,
  remainingAmount: 10,
  consumptionPct: 50,
  progressPct: 30,
  zone: "warning" as const,
  ...overrides,
});

describe("EvmBufferCard", () => {
  it("消化率・出来高率・残り・判定を表示する", () => {
    render(
      <EvmBufferCard
        bufferConsumption={{ current: status(), previous: null }}
        calculationMode="hours"
      />
    );

    expect(screen.getByText("50.0%")).toBeInTheDocument();
    expect(screen.getByText("30.0%")).toBeInTheDocument();
    expect(screen.getByText(/残り 10.0h \/ 20.0h/)).toBeInTheDocument();
    expect(screen.getByText("注意")).toBeInTheDocument();
  });

  it("前回値があれば前回の消化率・出来高率も表示する", () => {
    render(
      <EvmBufferCard
        bufferConsumption={{
          current: status(),
          previous: status({ consumptionPct: 20, progressPct: 25, zone: "healthy" }),
        }}
        calculationMode="hours"
        previousDate="2026-10-24T00:00:00.000Z"
      />
    );

    expect(screen.getByText(/前回（10\/24.*）: 消化率 20.0% \/ 出来高率 25.0%/)).toBeInTheDocument();
  });
});
