import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { TimelineHeader } from "@/components/gantt/timeline-header";

describe("TimelineHeader", () => {
  it("day スケールで日付ラベルの子ヘッダを描画", () => {
    render(
      <TimelineHeader
        start={new Date(2024, 0, 1)}
        end={new Date(2024, 0, 4)}
        scale="day"
        columnWidth={40}
        height={60}
        showWeekends={false}
      />,
    );
    expect(screen.getByText("1/1")).toBeInTheDocument();
    expect(screen.getByText("1/3")).toBeInTheDocument();
  });

  it("day スケールの親ヘッダに月ラベルを描画", () => {
    render(
      <TimelineHeader
        start={new Date(2024, 0, 1)}
        end={new Date(2024, 0, 4)}
        scale="day"
        columnWidth={40}
        height={60}
        showWeekends={false}
      />,
    );
    expect(screen.getByText("1月")).toBeInTheDocument();
  });
});
