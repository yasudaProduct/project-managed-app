import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import { TaskBar } from "@/components/ganttv3/task-bar";
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

  it("barColor 指定時は task.color より優先して使われる", () => {
    const task = makeTask({ id: "1", color: "#000000" });
    const { container } = renderInSvg(
      <TaskBar {...baseProps} task={task} barColor="#3B82F6" style={makeStyle()} />,
    );
    expect(container.querySelector("rect")).toHaveAttribute(
      "fill",
      "#3B82F620",
    );
  });

  it("barColor 未指定では task.color が使われる", () => {
    const task = makeTask({ id: "1", color: "#123456" });
    const { container } = renderInSvg(
      <TaskBar {...baseProps} task={task} style={makeStyle()} />,
    );
    expect(container.querySelector("rect")).toHaveAttribute(
      "fill",
      "#12345620",
    );
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

  describe("inside ラベル（タスク名+工数+進捗）", () => {
    it("inside 配置ではバー内にタスク名と工数を表示する", () => {
      const task = makeTask({ id: "1", name: "実装", duration: 8, progress: 40 });
      renderInSvg(
        <TaskBar
          {...baseProps}
          task={task}
          style={makeStyle({ labelPosition: "inside", showProgress: true })}
        />,
      );
      expect(screen.getByText("実装 (8h)")).toBeInTheDocument();
      expect(screen.getByText("40%")).toBeInTheDocument();
    });

    it("outside 配置ではバー内ラベル(foreignObject)を描画しない", () => {
      const task = makeTask({ id: "1", name: "実装" });
      const { container } = renderInSvg(
        <TaskBar
          {...baseProps}
          task={task}
          style={makeStyle({ labelPosition: "outside" })}
        />,
      );
      expect(container.querySelector("foreignObject")).not.toBeInTheDocument();
    });
  });

  describe("クリック/ホバー", () => {
    it("onSelect 指定時、バーのクリックで onSelect(taskId) が発火", () => {
      const onSelect = jest.fn();
      const { container } = renderInSvg(
        <TaskBar
          {...baseProps}
          onSelect={onSelect}
          task={makeTask({ id: "abc" })}
          style={makeStyle()}
        />,
      );
      fireEvent.click(container.querySelector("rect")!);
      expect(onSelect).toHaveBeenCalledWith("abc");
    });

    it("マイルストーンもクリックで onSelect が発火", () => {
      const onSelect = jest.fn();
      const { container } = renderInSvg(
        <TaskBar
          {...baseProps}
          onSelect={onSelect}
          task={makeTask({ id: "ms", isMilestone: true })}
          style={makeStyle({ labelPosition: "inside" })}
        />,
      );
      fireEvent.click(container.querySelector("polygon")!);
      expect(onSelect).toHaveBeenCalledWith("ms");
    });

    it("ホバーで onHover、離脱で onHoverEnd が発火", () => {
      const onHover = jest.fn();
      const onHoverEnd = jest.fn();
      const task = makeTask({ id: "1" });
      const { container } = renderInSvg(
        <TaskBar
          {...baseProps}
          onHover={onHover}
          onHoverEnd={onHoverEnd}
          task={task}
          style={makeStyle()}
        />,
      );
      const g = container.querySelector("g")!;
      fireEvent.mouseEnter(g);
      expect(onHover).toHaveBeenCalledWith(task, expect.anything());
      fireEvent.mouseLeave(g);
      expect(onHoverEnd).toHaveBeenCalled();
    });
  });

  describe("接続ハンドル（依存関係ドラッグ）", () => {
    it("editable かつ onConnectStart 指定時、ホバーで左右の接続ハンドルを表示", () => {
      const { container } = renderInSvg(
        <TaskBar
          {...baseProps}
          editable
          onConnectStart={jest.fn()}
          task={makeTask({ id: "1" })}
          style={makeStyle()}
        />,
      );
      expect(container.querySelectorAll(".gantt-connect-handle")).toHaveLength(0);
      fireEvent.mouseEnter(container.querySelector("g")!);
      const handles = container.querySelectorAll(".gantt-connect-handle");
      expect(handles).toHaveLength(2);
      expect(handles[0]).toHaveAttribute("data-side", "start");
      expect(handles[1]).toHaveAttribute("data-side", "end");
    });

    it("ハンドルの mousedown で onConnectStart(taskId, e, side) が発火", () => {
      const onConnectStart = jest.fn();
      const { container } = renderInSvg(
        <TaskBar
          {...baseProps}
          editable
          onConnectStart={onConnectStart}
          task={makeTask({ id: "abc" })}
          style={makeStyle()}
        />,
      );
      fireEvent.mouseEnter(container.querySelector("g")!);
      fireEvent.mouseDown(
        container.querySelector('.gantt-connect-handle[data-side="end"]')!,
      );
      expect(onConnectStart).toHaveBeenCalledWith(
        "abc",
        expect.anything(),
        "end",
      );
    });

    it("接続ハンドルの mousedown ではバー移動の onDragStart を発火しない", () => {
      const onDragStart = jest.fn();
      const { container } = renderInSvg(
        <TaskBar
          {...baseProps}
          editable
          onDragStart={onDragStart}
          onConnectStart={jest.fn()}
          task={makeTask({ id: "1" })}
          style={makeStyle()}
        />,
      );
      fireEvent.mouseEnter(container.querySelector("g")!);
      fireEvent.mouseDown(
        container.querySelector('.gantt-connect-handle[data-side="start"]')!,
      );
      expect(onDragStart).not.toHaveBeenCalled();
    });

    it("非 editable では表示しない", () => {
      const { container } = renderInSvg(
        <TaskBar
          {...baseProps}
          onConnectStart={jest.fn()}
          task={makeTask({ id: "1" })}
          style={makeStyle()}
        />,
      );
      fireEvent.mouseEnter(container.querySelector("g")!);
      expect(container.querySelectorAll(".gantt-connect-handle")).toHaveLength(0);
    });

    it("onConnectStart 未指定では表示しない", () => {
      const { container } = renderInSvg(
        <TaskBar
          {...baseProps}
          editable
          task={makeTask({ id: "1" })}
          style={makeStyle()}
        />,
      );
      fireEvent.mouseEnter(container.querySelector("g")!);
      expect(container.querySelectorAll(".gantt-connect-handle")).toHaveLength(0);
    });

    it("マイルストーンには表示しない", () => {
      const { container } = renderInSvg(
        <TaskBar
          {...baseProps}
          editable
          onConnectStart={jest.fn()}
          task={makeTask({ id: "1", isMilestone: true })}
          style={makeStyle()}
        />,
      );
      fireEvent.mouseEnter(container.querySelector("g")!);
      expect(container.querySelectorAll(".gantt-connect-handle")).toHaveLength(0);
    });

    it("isConnectSource のときはホバーなしでも表示（ドラッグ中の起点保持）", () => {
      const { container } = renderInSvg(
        <TaskBar
          {...baseProps}
          editable
          isConnectSource
          onConnectStart={jest.fn()}
          task={makeTask({ id: "1" })}
          style={makeStyle()}
        />,
      );
      expect(container.querySelectorAll(".gantt-connect-handle")).toHaveLength(2);
    });
  });
});
