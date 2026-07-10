import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";
import { QuickActions } from "@/components/gantt/quick-actions";
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
  it("操作ボタンはアイコンのみ（アクセシブルネーム/ツールチップでボタン名を示す）", () => {
    render(<QuickActions {...baseProps} />);
    const addButton = screen.getByRole("button", { name: "タスク追加" });
    expect(addButton).toBeInTheDocument();
    // ボタン内にテキストラベルは無い（アイコンのみ）
    expect(addButton).toHaveTextContent("");
  });

  it("タスク追加ボタンで onAddTask が発火", () => {
    render(<QuickActions {...baseProps} />);
    fireEvent.click(screen.getByRole("button", { name: "タスク追加" }));
    expect(baseProps.onAddTask).toHaveBeenCalled();
  });

  it("選択タスクなしでは複製・削除ボタンを表示しない", () => {
    render(<QuickActions {...baseProps} />);
    expect(
      screen.queryByRole("button", { name: /複製/ }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /削除/ }),
    ).not.toBeInTheDocument();
  });

  it("選択タスクありでは件数付きの複製・削除ボタンを表示し、クリックで発火", () => {
    render(
      <QuickActions {...baseProps} selectedTasks={new Set(["1", "2"])} />,
    );
    fireEvent.click(screen.getByRole("button", { name: "複製（2件）" }));
    expect(baseProps.onDuplicateTasks).toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "削除（2件）" }));
    expect(baseProps.onDeleteTasks).toHaveBeenCalled();
  });

  it.each([
    ["グリッド表示", "showGrid"],
    ["依存関係表示", "showDependencies"],
    ["クリティカルパス表示", "showCriticalPath"],
    ["本日ライン表示", "showTodayLine"],
    ["イナズマ線（進捗線）表示", "showProgressLine"],
    ["実績バー表示（予定の下段に実績を表示）", "showActual"],
    ["見通しバー表示（実績の下段に見通しを表示）", "showForecast"],
  ] as const)("%s ボタンで %s がトグルされる", (label, flag) => {
    const style = makeStyle();
    render(<QuickActions {...baseProps} style={style} />);
    fireEvent.click(screen.getByRole("button", { name: label }));
    expect(baseProps.onStyleChange).toHaveBeenCalledWith({
      ...style,
      [flag]: !style[flag],
    });
  });

  it("addDisabled のときタスク追加が無効化される", () => {
    render(<QuickActions {...baseProps} addDisabled />);
    expect(screen.getByRole("button", { name: "タスク追加" })).toBeDisabled();
  });

  it("無効化時もツールチップが開けるよう、ボタンをフォーカス可能な span で包む（disabled要素はhover/focusイベントを発火しないため）", () => {
    const { rerender } = render(<QuickActions {...baseProps} addDisabled />);
    const disabledButton = screen.getByRole("button", { name: "タスク追加" });
    expect(disabledButton.parentElement).toHaveAttribute("tabIndex", "0");

    rerender(<QuickActions {...baseProps} addDisabled={false} />);
    const enabledButton = screen.getByRole("button", { name: "タスク追加" });
    expect(enabledButton.parentElement).toHaveAttribute("tabIndex", "-1");
  });

  it("duplicateDisabled/deleteDisabled でそれぞれ独立して無効化される", () => {
    render(
      <QuickActions
        {...baseProps}
        selectedTasks={new Set(["1"])}
        duplicateDisabled
        deleteDisabled={false}
      />,
    );
    expect(
      screen.getByRole("button", { name: "複製（1件）" }),
    ).toBeDisabled();
    expect(
      screen.getByRole("button", { name: "削除（1件）" }),
    ).not.toBeDisabled();
  });

  it("色分けモード切替ボタンで onStyleChange に colorMode が渡る", () => {
    const style = makeStyle({ colorMode: "phase" });
    render(<QuickActions {...baseProps} style={style} />);
    fireEvent.click(
      screen.getByRole("button", { name: "予定・実績・見通しで色分け" }),
    );
    expect(baseProps.onStyleChange).toHaveBeenCalledWith({
      ...style,
      colorMode: "planActualForecast",
    });
  });

  it("onExportTsv 未指定なら TSV出力ボタンは表示しない", () => {
    render(<QuickActions {...baseProps} />);
    expect(
      screen.queryByRole("button", { name: "タスク一覧をTSVで出力" }),
    ).not.toBeInTheDocument();
  });

  it("onExportTsv 指定時は TSV出力ボタンを表示し、クリックで発火", () => {
    const onExportTsv = jest.fn();
    render(<QuickActions {...baseProps} onExportTsv={onExportTsv} />);
    fireEvent.click(
      screen.getByRole("button", { name: "タスク一覧をTSVで出力" }),
    );
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
