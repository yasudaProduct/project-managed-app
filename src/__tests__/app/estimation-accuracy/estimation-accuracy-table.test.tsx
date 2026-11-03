import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { EstimationAccuracyTable } from "@/app/estimation-accuracy/_components/estimation-accuracy-table";

describe("EstimationAccuracyTable", () => {
  it("実績/基準比を%で表示し、超過（100%超）を赤字にする", () => {
    render(
      <EstimationAccuracyTable
        title="工程テンプレート別"
        rows={[
          {
            key: "t:1",
            label: "基本設計",
            projectCount: 2,
            taskCount: 3,
            baselineHours: 40,
            actualHours: 50,
            actualToBaselineRatio: 1.25,
            overrunTaskRatePct: 66.666,
          },
          {
            key: "t:2",
            label: "結合テスト",
            projectCount: 1,
            taskCount: 1,
            baselineHours: 40,
            actualHours: 36,
            actualToBaselineRatio: 0.9,
            overrunTaskRatePct: 0,
          },
        ]}
      />
    );

    const design = screen.getByRole("row", { name: /基本設計/ });
    expect(design).toHaveTextContent("125.0%");
    expect(design).toHaveTextContent("66.7%");
    expect(screen.getByText("125.0%")).toHaveClass("text-red-600");
    expect(screen.getByText("90.0%")).not.toHaveClass("text-red-600");
  });

  it("行がなければその旨を表示する", () => {
    render(<EstimationAccuracyTable title="工程テンプレート別" rows={[]} />);

    expect(screen.getByText(/完了タスクがありません/)).toBeInTheDocument();
  });
});
