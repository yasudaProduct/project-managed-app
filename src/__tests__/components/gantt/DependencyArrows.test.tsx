import React from "react";
import { render, fireEvent } from "@testing-library/react";
import { DependencyArrows } from "@/components/gantt/dependency-arrows";
import { makeTask, makeStyle, makeDependency } from "./_fixtures";

const EPOCH = Date.UTC(2024, 0, 1);
const day = (n: number) => new Date(EPOCH + n * 86400000);
const dateToX = (d: Date) => ((d.getTime() - EPOCH) / 86400000) * 40;
// バー右端用（終了日を含む inclusive 終端）: 翌日0時のX
const dateToXEnd = (d: Date) => dateToX(new Date(d.getTime() + 86400000));

function renderInSvg(ui: React.ReactElement) {
  return render(<svg>{ui}</svg>);
}

describe("DependencyArrows", () => {
  it("先行関係があると矢印を描画（異なる行は path）", () => {
    const tasks = [
      makeTask({ id: "A", startDate: day(0), endDate: day(2) }),
      makeTask({
        id: "B",
        startDate: day(3),
        endDate: day(5),
        predecessors: [makeDependency("A")],
      }),
    ];
    const { container } = renderInSvg(
      <DependencyArrows
        tasks={tasks}
        dateToX={dateToX}
        dateToXEnd={dateToXEnd}
        rowHeight={30}
        taskHeight={20}
        style={makeStyle()}
      />,
    );
    expect(container.querySelectorAll("path").length).toBeGreaterThanOrEqual(1);
  });

  it("先行関係が無ければ矢印(path/line)を描画しない", () => {
    const tasks = [makeTask({ id: "A" }), makeTask({ id: "B" })];
    const { container } = renderInSvg(
      <DependencyArrows
        tasks={tasks}
        dateToX={dateToX}
        dateToXEnd={dateToXEnd}
        rowHeight={30}
        taskHeight={20}
        style={makeStyle()}
      />,
    );
    expect(container.querySelectorAll("path")).toHaveLength(0);
    expect(container.querySelectorAll("line")).toHaveLength(0);
  });

  describe("矢印のクリック（onArrowClick）", () => {
    const tasks = [
      makeTask({ id: "A", startDate: day(0), endDate: day(2) }),
      makeTask({
        id: "B",
        startDate: day(3),
        endDate: day(5),
        predecessors: [makeDependency("A")],
      }),
    ];

    it("onArrowClick 指定時、透明なヒット領域をクリックで後続タスクIDを通知", () => {
      const onArrowClick = jest.fn();
      const { container } = renderInSvg(
        <DependencyArrows
          tasks={tasks}
          dateToX={dateToX}
          dateToXEnd={dateToXEnd}
          rowHeight={30}
          taskHeight={20}
          style={makeStyle()}
          onArrowClick={onArrowClick}
        />,
      );
      const hit = container.querySelector('[data-dep-arrow="A->B"]');
      expect(hit).not.toBeNull();
      fireEvent.click(hit!);
      expect(onArrowClick).toHaveBeenCalledWith("B");
    });

    it("onArrowClick 未指定ではヒット領域を描画しない", () => {
      const { container } = renderInSvg(
        <DependencyArrows
          tasks={tasks}
          dateToX={dateToX}
          dateToXEnd={dateToXEnd}
          rowHeight={30}
          taskHeight={20}
          style={makeStyle()}
        />,
      );
      expect(container.querySelector("[data-dep-arrow]")).toBeNull();
    });
  });
});
