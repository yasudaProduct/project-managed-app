import React from "react";
import { render, screen, fireEvent, within } from "@testing-library/react";
import "@testing-library/jest-dom";
import { TaskFilterControl } from "@/components/gantt/task-filter-control";
import {
  EMPTY_TASK_FILTER,
  UNASSIGNED_LABEL,
  type TaskFilter,
} from "@/components/gantt/utils/taskFilter";

// Radix Popover が jsdom で使う API のポリフィル
beforeAll(() => {
  window.HTMLElement.prototype.scrollIntoView = jest.fn();
  window.HTMLElement.prototype.hasPointerCapture = jest.fn();
  global.ResizeObserver = jest.fn().mockImplementation(() => ({
    observe: jest.fn(),
    unobserve: jest.fn(),
    disconnect: jest.fn(),
  }));
});

const assignees = [
  { id: 1, name: "山田" },
  { id: 2, name: "田中" },
];

function setup(filter: TaskFilter = EMPTY_TASK_FILTER) {
  const onChange = jest.fn();
  render(
    <TaskFilterControl
      filter={filter}
      onChange={onChange}
      assignees={assignees}
    />,
  );
  return { onChange };
}

describe("TaskFilterControl", () => {
  it("条件が無いときはカウントバッジを表示しない", () => {
    setup();
    expect(screen.queryByTestId("gantt-filter-count")).not.toBeInTheDocument();
  });

  it("有効な条件数をバッジ表示する", () => {
    setup({
      keyword: "実装",
      keywordMode: "partial",
      statuses: ["COMPLETED", "ON_HOLD"],
      assignees: ["山田"],
    });
    expect(screen.getByTestId("gantt-filter-count")).toHaveTextContent("4");
  });

  it("キーワード入力で onChange が発火する", () => {
    const { onChange } = setup();
    fireEvent.click(screen.getByTestId("gantt-filter-trigger"));
    fireEvent.change(screen.getByTestId("gantt-filter-keyword"), {
      target: { value: "設計" },
    });
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ keyword: "設計" }),
    );
  });

  it("正規表現モードへ切り替えできる", () => {
    const { onChange } = setup();
    fireEvent.click(screen.getByTestId("gantt-filter-trigger"));
    fireEvent.click(screen.getByText("正規表現"));
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ keywordMode: "regex" }),
    );
  });

  it("不正な正規表現でエラーを表示する", () => {
    setup({ ...EMPTY_TASK_FILTER, keyword: "[", keywordMode: "regex" });
    fireEvent.click(screen.getByTestId("gantt-filter-trigger"));
    expect(screen.getByText("正規表現が不正です")).toBeInTheDocument();
  });

  it("ステータスのチェックで onChange が発火する", () => {
    const { onChange } = setup();
    fireEvent.click(screen.getByTestId("gantt-filter-trigger"));
    fireEvent.click(screen.getByText("進行中"));
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ statuses: ["IN_PROGRESS"] }),
    );
  });

  it("担当者に「未割当」を含めて選択できる", () => {
    const { onChange } = setup();
    fireEvent.click(screen.getByTestId("gantt-filter-trigger"));
    expect(screen.getByText(UNASSIGNED_LABEL)).toBeInTheDocument();
    fireEvent.click(screen.getByText("田中"));
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ assignees: ["田中"] }),
    );
  });

  it("クリアで空フィルタへ戻す", () => {
    const { onChange } = setup({
      ...EMPTY_TASK_FILTER,
      keyword: "実装",
      statuses: ["COMPLETED"],
    });
    fireEvent.click(screen.getByTestId("gantt-filter-trigger"));
    fireEvent.click(screen.getByTestId("gantt-filter-clear"));
    expect(onChange).toHaveBeenCalledWith(EMPTY_TASK_FILTER);
  });

  it("選択済みステータスの再クリックで解除する", () => {
    const { onChange } = setup({
      ...EMPTY_TASK_FILTER,
      statuses: ["IN_PROGRESS"],
    });
    fireEvent.click(screen.getByTestId("gantt-filter-trigger"));
    // 既に選択済みの「進行中」をクリックして解除する
    fireEvent.click(within(document.body).getByText("進行中"));
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ statuses: [] }),
    );
  });
});
