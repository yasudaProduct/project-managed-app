import React from "react";
import { render } from "@testing-library/react";
import "@testing-library/jest-dom";
import { ProgressLine } from "@/components/ganttv3/progress-line";
import { makeTask } from "./_fixtures";

const DAY = 24 * 60 * 60 * 1000;
const dateToX = (d: Date): number => d.getTime() / DAY;

function renderInSvg(ui: React.ReactElement) {
  return render(<svg>{ui}</svg>);
}

const timelineStart = new Date("2024-01-01T00:00:00.000Z");
const timelineEnd = new Date("2024-02-01T00:00:00.000Z");
const today = new Date("2024-01-10T00:00:00.000Z");

describe("ProgressLine", () => {
  it("進捗点を通る polyline と頂点ドットを描画する", () => {
    const tasks = [
      makeTask({
        id: "1",
        startDate: new Date("2024-01-01T00:00:00.000Z"),
        endDate: new Date("2024-01-11T00:00:00.000Z"),
        progress: 50,
      }),
      makeTask({
        id: "2",
        startDate: new Date("2024-01-01T00:00:00.000Z"),
        endDate: new Date("2024-01-11T00:00:00.000Z"),
        progress: 100,
      }),
    ];
    const centerYById = new Map([
      ["1", 10],
      ["2", 30],
    ]);
    const { container, getByTestId } = renderInSvg(
      <ProgressLine
        tasks={tasks}
        centerYById={centerYById}
        dateToX={dateToX}
        timelineStart={timelineStart}
        timelineEnd={timelineEnd}
        topY={0}
        bottomY={100}
        color="#DB2777"
        today={today}
      />,
    );

    expect(getByTestId("ganttv3-progress-line")).toBeInTheDocument();
    const polyline = container.querySelector("polyline")!;
    expect(polyline).toBeInTheDocument();
    expect(polyline).toHaveAttribute("stroke", "#DB2777");
    // 端点2 + タスク2 = 4頂点
    expect(polyline.getAttribute("points")!.trim().split(" ")).toHaveLength(4);
    // 頂点ドットは端点を除くタスク2点
    expect(container.querySelectorAll("circle")).toHaveLength(2);
  });

  it("基準日がタイムライン終了より後なら何も描画しない", () => {
    const { queryByTestId } = renderInSvg(
      <ProgressLine
        tasks={[makeTask({ id: "1" })]}
        centerYById={new Map([["1", 10]])}
        dateToX={dateToX}
        timelineStart={timelineStart}
        timelineEnd={timelineEnd}
        topY={0}
        bottomY={100}
        color="#DB2777"
        today={new Date("2024-03-01T00:00:00.000Z")}
      />,
    );
    expect(queryByTestId("ganttv3-progress-line")).not.toBeInTheDocument();
  });

  it("基準日がタイムライン開始より前なら何も描画しない", () => {
    const { queryByTestId } = renderInSvg(
      <ProgressLine
        tasks={[makeTask({ id: "1" })]}
        centerYById={new Map([["1", 10]])}
        dateToX={dateToX}
        timelineStart={timelineStart}
        timelineEnd={timelineEnd}
        topY={0}
        bottomY={100}
        color="#DB2777"
        today={new Date("2023-12-01T00:00:00.000Z")}
      />,
    );
    expect(queryByTestId("ganttv3-progress-line")).not.toBeInTheDocument();
  });

  it("進捗点が1つも無い（全てマイルストーン）場合は縦線を描画しない", () => {
    const tasks = [
      makeTask({ id: "1", isMilestone: true }),
      makeTask({ id: "2", isMilestone: true }),
    ];
    const centerYById = new Map([
      ["1", 10],
      ["2", 30],
    ]);
    const { queryByTestId } = renderInSvg(
      <ProgressLine
        tasks={tasks}
        centerYById={centerYById}
        dateToX={dateToX}
        timelineStart={timelineStart}
        timelineEnd={timelineEnd}
        topY={0}
        bottomY={100}
        color="#DB2777"
        today={today}
      />,
    );
    expect(queryByTestId("ganttv3-progress-line")).not.toBeInTheDocument();
  });

  it("centerY 未登録のタスクはスキップする", () => {
    const tasks = [
      makeTask({
        id: "1",
        startDate: new Date("2024-01-01T00:00:00.000Z"),
        endDate: new Date("2024-01-11T00:00:00.000Z"),
        progress: 50,
      }),
      makeTask({ id: "missing" }),
    ];
    const centerYById = new Map([["1", 10]]);
    const { container } = renderInSvg(
      <ProgressLine
        tasks={tasks}
        centerYById={centerYById}
        dateToX={dateToX}
        timelineStart={timelineStart}
        timelineEnd={timelineEnd}
        topY={0}
        bottomY={100}
        color="#DB2777"
        today={today}
      />,
    );
    // 端点2 + タスク1 = 3頂点、ドットは1
    expect(
      container.querySelector("polyline")!.getAttribute("points")!.trim().split(" "),
    ).toHaveLength(3);
    expect(container.querySelectorAll("circle")).toHaveLength(1);
  });
});
