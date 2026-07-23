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

  describe("variant による期間・工数の切り替え", () => {
    const task = makeTask({
      id: "1",
      name: "タスク",
      duration: 2,
      startDate: new Date(2024, 0, 1),
      endDate: new Date(2024, 0, 3),
      actualStartDate: new Date(2024, 0, 2),
      actualEndDate: new Date(2024, 0, 5),
      actualDuration: 4,
      forecastStartDate: new Date(2024, 0, 2),
      forecastEndDate: new Date(2024, 0, 9),
      forecastDuration: 6.25,
    });

    it("variant 未指定（既定）では予定期間・予定工数を表示する", () => {
      render(<TaskTooltip task={task} x={0} y={0} />);
      expect(screen.getByText("予定")).toBeInTheDocument();
      expect(
        screen.getByText("2024/01/01 〜 2024/01/03"),
      ).toBeInTheDocument();
      expect(screen.getByText("2h")).toBeInTheDocument();
    });

    it("variant='actual' では実績期間・実績工数を表示する", () => {
      render(<TaskTooltip task={task} x={0} y={0} variant="actual" />);
      expect(screen.getByText("実績")).toBeInTheDocument();
      expect(
        screen.getByText("2024/01/02 〜 2024/01/05"),
      ).toBeInTheDocument();
      expect(screen.getByText("4h")).toBeInTheDocument();
      expect(screen.queryByText("予定")).not.toBeInTheDocument();
    });

    it("variant='forecast' では見通し期間・見通し工数（小数第1位に丸め）を表示する", () => {
      render(<TaskTooltip task={task} x={0} y={0} variant="forecast" />);
      expect(screen.getByText("見通し")).toBeInTheDocument();
      expect(
        screen.getByText("2024/01/02 〜 2024/01/09"),
      ).toBeInTheDocument();
      expect(screen.getByText("6.3h")).toBeInTheDocument();
    });

    it("実績終了日が未設定なら実績開始日を終了側にも使う", () => {
      const inProgress = makeTask({
        id: "2",
        name: "進行中タスク",
        actualStartDate: new Date(2024, 0, 2),
        actualDuration: 1,
      });
      render(
        <TaskTooltip task={inProgress} x={0} y={0} variant="actual" />,
      );
      expect(
        screen.getByText("2024/01/02 〜 2024/01/02"),
      ).toBeInTheDocument();
    });
  });
});
