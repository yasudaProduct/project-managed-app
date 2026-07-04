import React from "react";
import { render } from "@testing-library/react";
import { GridLines } from "@/components/ganttv3/GridLines";

function renderInSvg(ui: React.ReactElement) {
  return render(<svg>{ui}</svg>);
}

const base = {
  width: 400,
  height: 100,
  columnWidth: 40,
  rowHeight: 20,
  weekendColor: "#eeeeee",
};

describe("GridLines", () => {
  it("縦線は ceil(width/columnWidth)+1 本", () => {
    const { container } = renderInSvg(
      <GridLines
        {...base}
        scale="week"
        startDate={new Date(2024, 0, 1)}
        showWeekends={false}
      />,
    );
    const vertical = Array.from(container.querySelectorAll("line")).filter(
      (l) => l.getAttribute("x1") === l.getAttribute("x2"),
    );
    expect(vertical).toHaveLength(11); // ceil(400/40)+1
  });

  it("rowBoundaries 指定時はその本数の水平線", () => {
    const { container } = renderInSvg(
      <GridLines
        {...base}
        scale="week"
        startDate={new Date(2024, 0, 1)}
        showWeekends={false}
        rowBoundaries={[0, 20, 45, 70]}
      />,
    );
    const horizontal = Array.from(container.querySelectorAll("line")).filter(
      (l) => l.getAttribute("y1") === l.getAttribute("y2"),
    );
    expect(horizontal).toHaveLength(4);
  });

  it("週末背景: showWeekends かつ scale=day で週末 rect を描画", () => {
    const { container } = renderInSvg(
      <GridLines
        {...base}
        width={280}
        height={60}
        scale="day"
        startDate={new Date(2024, 0, 6)} // 土曜
        showWeekends
      />,
    );
    // 2024-01-06(土), 07(日) の2日が週末
    expect(container.querySelectorAll("rect")).toHaveLength(2);
  });

  it("scale=week では週末背景を描画しない", () => {
    const { container } = renderInSvg(
      <GridLines
        {...base}
        width={280}
        height={60}
        scale="week"
        startDate={new Date(2024, 0, 6)}
        showWeekends
      />,
    );
    expect(container.querySelectorAll("rect")).toHaveLength(0);
  });
});
