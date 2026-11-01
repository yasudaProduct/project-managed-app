import React from "react";
import { render, screen, within } from "@testing-library/react";
import "@testing-library/jest-dom";
import { PortfolioTable } from "@/app/portfolio/_components/portfolio-table";
import type { PortfolioRowDto } from "@/applications/portfolio/portfolio-application-service";

const makeRow = (overrides: Partial<PortfolioRowDto> = {}): PortfolioRowDto => ({
  projectId: "p2",
  projectName: "案件B",
  wbsId: 2,
  wbsName: "WBS-B",
  healthStatus: "critical",
  spi: 0.6,
  cpi: 0.75,
  completionRate: 30,
  bac: 200,
  eac: 333.3,
  vac: -133.3,
  forecastCompletionDate: "2027-02-01T00:00:00.000Z",
  plannedEndDate: "2026-12-01T00:00:00.000Z",
  scheduleDelayDays: 62,
  endOverdueCount: 2,
  startOverdueCount: 1,
  assigneesWithMissingEntries: 2,
  lastWbsSyncAt: "2026-11-01T00:00:00.000Z",
  isSpiDeteriorating: false,
  isCpiDeteriorating: false,
  loadError: null,
  ...overrides,
});

describe("PortfolioTable", () => {
  it("プロジェクトごとにヘルス・SPI/CPI・予測完了の遅れ・遅れタスク・入力漏れを表示し、プロジェクト画面へリンクする", () => {
    render(<PortfolioTable rows={[makeRow()]} />);

    const row = screen.getByRole("row", { name: /案件B/ });
    expect(within(row).getByRole("link", { name: /案件B/ })).toHaveAttribute(
      "href",
      "/projects/p2"
    );
    expect(row).toHaveTextContent("危機的");
    expect(row).toHaveTextContent("0.600");
    expect(row).toHaveTextContent("0.750");
    expect(row).toHaveTextContent("62日遅れ");
    expect(row).toHaveTextContent("終了遅れ 2");
    expect(row).toHaveTextContent("開始遅れ 1");
    expect(row).toHaveTextContent("2人");
  });

  it("取得に失敗した行はエラーを表示する", () => {
    render(
      <PortfolioTable
        rows={[makeRow({ loadError: "データを取得できませんでした", healthStatus: "no_data", spi: null, cpi: null })]}
      />
    );

    expect(screen.getByText("データを取得できませんでした")).toBeInTheDocument();
  });

  it("対象がなければその旨を表示する", () => {
    render(<PortfolioTable rows={[]} />);

    expect(screen.getByText(/対象のプロジェクトがありません/)).toBeInTheDocument();
  });

  it("SPI/CPIが連続して悪化しているプロジェクトに印を付ける", () => {
    render(<PortfolioTable rows={[makeRow({ isSpiDeteriorating: true })]} />);

    const row = screen.getByRole("row", { name: /案件B/ });
    expect(row).toHaveTextContent("SPI悪化");
    expect(row).not.toHaveTextContent("CPI悪化");
  });
});
