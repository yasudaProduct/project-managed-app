import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { ScheduleSlipBadge } from "@/components/wbs/schedule-slip-badge";

describe("ScheduleSlipBadge", () => {
  it("遅れは +N日 を赤字で表示する", () => {
    render(<ScheduleSlipBadge days={3} />);
    expect(screen.getByText("+3日")).toHaveClass("text-red-600");
  });

  it("前倒しは −N日、ずれなしは ±0 と表示する", () => {
    const { rerender } = render(<ScheduleSlipBadge days={-2} />);
    expect(screen.getByText("-2日")).toHaveClass("text-green-700");
    rerender(<ScheduleSlipBadge days={0} />);
    expect(screen.getByText("±0")).toBeInTheDocument();
  });

  it("基準未設定（null）は — を表示する", () => {
    render(<ScheduleSlipBadge days={null} />);
    expect(screen.getByText("—")).toBeInTheDocument();
  });
});
