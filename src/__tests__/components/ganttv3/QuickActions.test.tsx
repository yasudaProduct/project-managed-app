import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";
import { QuickActions } from "@/components/ganttv3/QuickActions";
import { makeStyle } from "./_fixtures";

// Radix Select が要求する jsdom 非対応API のポリフィル
window.HTMLElement.prototype.hasPointerCapture = jest.fn();
window.HTMLElement.prototype.releasePointerCapture = jest.fn();
window.HTMLElement.prototype.setPointerCapture = jest.fn();
window.HTMLElement.prototype.scrollIntoView = jest.fn();

const baseProps = {
  timelineScale: "month" as const,
  onTimelineScaleChange: jest.fn(),
  style: makeStyle(),
  onStyleChange: jest.fn(),
  selectedTasks: new Set<string>(),
  onAddTask: jest.fn(),
  onDeleteTasks: jest.fn(),
  onDuplicateTasks: jest.fn(),
};

beforeEach(() => jest.clearAllMocks());

describe("QuickActions", () => {
  it("タスク追加ボタンで onAddTask が発火", () => {
    render(<QuickActions {...baseProps} />);
    fireEvent.click(screen.getByText("🚧タスク追加"));
    expect(baseProps.onAddTask).toHaveBeenCalled();
  });

  it("選択タスクなしでは複製・削除ボタンを表示しない", () => {
    render(<QuickActions {...baseProps} />);
    expect(screen.queryByText(/複製/)).not.toBeInTheDocument();
    expect(screen.queryByText(/削除/)).not.toBeInTheDocument();
  });

  it("選択タスクありでは件数付きの複製・削除ボタンを表示し、クリックで発火", () => {
    render(
      <QuickActions {...baseProps} selectedTasks={new Set(["1", "2"])} />,
    );
    fireEvent.click(screen.getByText("複製 (2)"));
    expect(baseProps.onDuplicateTasks).toHaveBeenCalled();
    fireEvent.click(screen.getByText("削除 (2)"));
    expect(baseProps.onDeleteTasks).toHaveBeenCalled();
  });

  it.each([
    ["グリッド表示", "showGrid"],
    ["依存関係表示", "showDependencies"],
    ["クリティカルパス表示", "showCriticalPath"],
    ["本日ライン表示", "showTodayLine"],
    ["実績バー表示（予定の下段に実績を表示）", "showActual"],
  ] as const)("%s ボタンで %s がトグルされる", (title, flag) => {
    const style = makeStyle();
    render(<QuickActions {...baseProps} style={style} />);
    fireEvent.click(screen.getByTitle(title));
    expect(baseProps.onStyleChange).toHaveBeenCalledWith({
      ...style,
      [flag]: !style[flag],
    });
  });

  it("onExportTsv 未指定なら TSV出力ボタンは表示しない", () => {
    render(<QuickActions {...baseProps} />);
    expect(screen.queryByText("TSV出力")).not.toBeInTheDocument();
  });

  it("onExportTsv 指定時は TSV出力ボタンを表示し、クリックで発火", () => {
    const onExportTsv = jest.fn();
    render(<QuickActions {...baseProps} onExportTsv={onExportTsv} />);
    fireEvent.click(screen.getByText("TSV出力"));
    expect(onExportTsv).toHaveBeenCalled();
  });

  it("グループ/並び順セレクトは各コールバック指定時のみ表示される", () => {
    const { rerender } = render(<QuickActions {...baseProps} />);
    expect(screen.queryByText("フェーズ")).not.toBeInTheDocument();
    expect(screen.queryByText("タスクNo順")).not.toBeInTheDocument();

    rerender(
      <QuickActions
        {...baseProps}
        groupBy="phase"
        onGroupByChange={jest.fn()}
        sortBy="taskNo"
        onSortByChange={jest.fn()}
      />,
    );
    expect(screen.getByText("フェーズ")).toBeInTheDocument();
    expect(screen.getByText("タスクNo順")).toBeInTheDocument();
  });

  it("タイムラインスケールの選択で onTimelineScaleChange が発火", async () => {
    // Radix Select 内部の装飾要素は pointer-events:none のためチェックを無効化
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    render(<QuickActions {...baseProps} />);
    // 現在値「月」のトリガーを開いて「週」を選ぶ
    await user.click(screen.getByRole("combobox"));
    await user.click(await screen.findByRole("option", { name: "週" }));
    expect(baseProps.onTimelineScaleChange).toHaveBeenCalledWith("week");
  });

  it("グループの選択で onGroupByChange が発火", async () => {
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    const onGroupByChange = jest.fn();
    render(
      <QuickActions
        {...baseProps}
        groupBy="phase"
        onGroupByChange={onGroupByChange}
      />,
    );
    // DOM順: グループ → タイムラインスケール
    await user.click(screen.getAllByRole("combobox")[0]);
    await user.click(await screen.findByRole("option", { name: "担当者" }));
    expect(onGroupByChange).toHaveBeenCalledWith("assignee");
  });
});
