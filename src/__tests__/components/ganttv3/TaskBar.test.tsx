import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import { TaskBar } from "@/components/ganttv3/TaskBar";
import { makeTask, makeStyle } from "./_fixtures";

function renderInSvg(ui: React.ReactElement) {
  return render(<svg>{ui}</svg>);
}

const baseProps = {
  x: 10,
  y: 0,
  width: 100,
  height: 20,
  onDragStart: jest.fn(),
  isDragging: false,
};

describe("TaskBar", () => {
  it("通常タスクは rect バーと outside ラベル(タスク名)を描画", () => {
    const task = makeTask({ id: "1", name: "実装" });
    const { container } = renderInSvg(
      <TaskBar
        {...baseProps}
        task={task}
        style={makeStyle({ labelPosition: "outside" })}
      />,
    );
    expect(container.querySelector("rect")).toBeInTheDocument();
    expect(screen.getByText("実装")).toBeInTheDocument();
  });

  it("マイルストーンは polygon(ダイヤ)を描画し inside ラベルで名前表示", () => {
    const task = makeTask({ id: "1", name: "MS", isMilestone: true });
    const { container } = renderInSvg(
      <TaskBar
        {...baseProps}
        task={task}
        style={makeStyle({ labelPosition: "inside" })}
      />,
    );
    expect(container.querySelector("polygon")).toBeInTheDocument();
    expect(screen.getByText("MS")).toBeInTheDocument();
  });

  it("進捗バー: showProgress かつ progress>0 で rect が1本増える", () => {
    const style = makeStyle({
      showProgress: true,
      showCriticalPath: false,
      labelPosition: "outside",
    });
    const zero = renderInSvg(
      <TaskBar {...baseProps} task={makeTask({ id: "1", progress: 0 })} style={style} />,
    );
    const some = renderInSvg(
      <TaskBar {...baseProps} task={makeTask({ id: "2", progress: 50 })} style={style} />,
    );
    expect(zero.container.querySelectorAll("rect")).toHaveLength(1);
    expect(some.container.querySelectorAll("rect")).toHaveLength(2);
  });

  it("クリティカルパス: isOnCriticalPath かつ showCriticalPath で点線枠を描画", () => {
    const task = makeTask({ id: "1", isOnCriticalPath: true });
    const { container } = renderInSvg(
      <TaskBar {...baseProps} task={task} style={makeStyle({ showCriticalPath: true })} />,
    );
    expect(
      container.querySelector('rect[stroke-dasharray="4,2"]'),
    ).toBeInTheDocument();
  });

  it("data-task-id 属性を持つ（E2E用フック）", () => {
    const { container } = renderInSvg(
      <TaskBar {...baseProps} task={makeTask({ id: "task-9" })} style={makeStyle()} />,
    );
    expect(container.querySelector('[data-task-id="task-9"]')).toBeInTheDocument();
  });

  it("バーの mousedown で onDragStart(move) が発火", () => {
    const onDragStart = jest.fn();
    const task = makeTask({ id: "abc" });
    const { container } = renderInSvg(
      <TaskBar
        {...baseProps}
        onDragStart={onDragStart}
        task={task}
        style={makeStyle()}
      />,
    );
    fireEvent.mouseDown(container.querySelector("rect")!);
    expect(onDragStart).toHaveBeenCalledWith("abc", expect.anything(), "move");
  });

  it("editable かつホバーでリサイズハンドルを表示", () => {
    const task = makeTask({ id: "1" });
    const { container } = renderInSvg(
      <TaskBar {...baseProps} editable task={task} style={makeStyle()} />,
    );
    expect(container.querySelectorAll(".cursor-ew-resize")).toHaveLength(0);
    fireEvent.mouseEnter(container.querySelector("g")!);
    expect(container.querySelectorAll(".cursor-ew-resize")).toHaveLength(2);
  });
});
