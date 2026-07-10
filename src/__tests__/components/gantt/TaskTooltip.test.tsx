import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { TaskTooltip } from "@/components/gantt/task-tooltip";
import { makeTask } from "./_fixtures";

describe("TaskTooltip", () => {
  it("タスク名・担当者・ステータス・工数・進捗など重要情報を表示する", () => {
    const task = makeTask({
      id: "1",
      name: "設計レビュー",
      taskNo: "P-0001",
      assignee: "山田",
      status: "IN_PROGRESS",
      duration: 8,
      progress: 40,
      startDate: new Date(2024, 0, 1),
      endDate: new Date(2024, 0, 3),
    });
    render(<TaskTooltip task={task} x={100} y={100} />);

    expect(screen.getByText(/設計レビュー/)).toBeInTheDocument();
    expect(screen.getByText("山田")).toBeInTheDocument();
    expect(screen.getByText("進行中")).toBeInTheDocument();
    expect(screen.getByText("8h")).toBeInTheDocument();
    expect(screen.getByText("40%")).toBeInTheDocument();
    expect(screen.getByText("2024/01/01 〜 2024/01/03")).toBeInTheDocument();
  });

  it("担当者未設定は「未割当」と表示する", () => {
    const task = makeTask({ id: "1", name: "タスク", assignee: undefined });
    render(<TaskTooltip task={task} x={0} y={0} />);
    expect(screen.getByText("未割当")).toBeInTheDocument();
  });

  it("マイルストーンは担当者/工数/進捗を出さず単一日付を表示する", () => {
    const task = makeTask({
      id: "m",
      name: "リリース",
      isMilestone: true,
      startDate: new Date(2024, 0, 10),
    });
    render(<TaskTooltip task={task} x={0} y={0} />);
    expect(screen.getByText(/リリース/)).toBeInTheDocument();
    expect(screen.queryByText("担当者")).not.toBeInTheDocument();
    expect(screen.getByText("2024/01/10")).toBeInTheDocument();
  });

  it("カーソル座標に応じた位置で表示する（少しオフセット）", () => {
    const task = makeTask({ id: "1", name: "タスク" });
    render(<TaskTooltip task={task} x={200} y={150} />);
    const tip = screen.getByTestId("gantt-task-tooltip");
    // Tailwind の `fixed` は jsdom では算出されないため inline の left/top を検証
    expect(tip).toHaveStyle({ left: "214px", top: "164px" });
    expect(tip).toHaveClass("fixed", "pointer-events-none");
  });
});
