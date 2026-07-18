import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { TaskDetailSidebar } from "@/components/gantt/task-detail-sidebar";
import { makeTask } from "./_fixtures";

// Radix Dialog(Sheet) が jsdom で使う API のポリフィル
beforeAll(() => {
  window.HTMLElement.prototype.scrollIntoView = jest.fn();
  window.HTMLElement.prototype.hasPointerCapture = jest.fn();
});

describe("TaskDetailSidebar", () => {
  it("open=false では内容を描画しない", () => {
    render(
      <TaskDetailSidebar
        task={makeTask({ id: "1", name: "タスク" })}
        open={false}
        onOpenChange={jest.fn()}
      />,
    );
    expect(screen.queryByTestId("gantt-task-detail")).not.toBeInTheDocument();
  });

  it("タスクの全情報を表示する", () => {
    const task = makeTask({
      id: "1",
      name: "設計レビュー",
      taskNo: "P-0001",
      category: "設計",
      assignee: "山田",
      status: "IN_PROGRESS",
      progressRate: 45,
      duration: 8,
      startDate: new Date(2024, 0, 1),
      endDate: new Date(2024, 0, 3),
      actualStartDate: new Date(2024, 0, 2),
      actualDuration: 12.34,
      forecastEndDate: new Date(2024, 0, 8),
      forecastDuration: 20,
      description: "レビュー観点の説明",
    });
    render(
      <TaskDetailSidebar task={task} open onOpenChange={jest.fn()} />,
    );

    expect(screen.getByTestId("gantt-task-detail")).toBeInTheDocument();
    expect(screen.getAllByText("設計レビュー").length).toBeGreaterThan(0);
    // タスクNo は説明欄と明細の2箇所に出る
    expect(screen.getAllByText("P-0001").length).toBeGreaterThan(0);
    expect(screen.getByText("設計")).toBeInTheDocument();
    expect(screen.getByText("山田")).toBeInTheDocument();
    expect(screen.getByText("進行中")).toBeInTheDocument();
    expect(screen.getByText("45%")).toBeInTheDocument();
    expect(screen.getByText("2024/01/01")).toBeInTheDocument();
    expect(screen.getByText("8h")).toBeInTheDocument();
    expect(screen.getByText("2024/01/02")).toBeInTheDocument(); // 実績開始
    expect(screen.getByText("2024/01/08")).toBeInTheDocument(); // 見通し終了
    expect(screen.getByText("実績工数")).toBeInTheDocument();
    expect(screen.getByText("12.3h")).toBeInTheDocument(); // 実績工数（小数第1位に丸め）
    expect(screen.getByText("見通し工数")).toBeInTheDocument();
    expect(screen.getByText("20h")).toBeInTheDocument();
    expect(screen.getByText("レビュー観点の説明")).toBeInTheDocument();
  });

  it("マイルストーンは担当者・工数などタスク固有項目を出さない", () => {
    const task = makeTask({
      id: "m",
      name: "リリース",
      isMilestone: true,
      startDate: new Date(2024, 0, 10),
    });
    render(<TaskDetailSidebar task={task} open onOpenChange={jest.fn()} />);
    // 説明欄は「タスク詳細（マイルストーン）」のように連結されるため部分一致で検証
    expect(screen.getByText(/マイルストーン/)).toBeInTheDocument();
    expect(screen.queryByText("担当者")).not.toBeInTheDocument();
    expect(screen.queryByText("予定工数")).not.toBeInTheDocument();
  });
});
