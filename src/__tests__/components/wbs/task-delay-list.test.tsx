import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";
import { TaskDelayList } from "@/components/wbs/task-delay-list";
import type { TaskDelayDto } from "@/applications/task-delay/task-delay-application-service";

const makeDelay = (overrides: Partial<TaskDelayDto>): TaskDelayDto => ({
  taskId: 1,
  taskNo: "D1-0001",
  taskName: "基本設計書作成",
  status: "IN_PROGRESS",
  assigneeId: 7,
  assigneeName: "山田",
  phaseName: "設計",
  plannedStart: "2026-10-01T00:00:00.000Z",
  plannedEnd: "2026-10-28T00:00:00.000Z",
  progressRate: 60,
  kind: "END_OVERDUE",
  days: 3,
  ...overrides,
});

describe("TaskDelayList", () => {
  it("種類ごとのラベルを表示する", () => {
    render(
      <TaskDelayList
        delays={[
          makeDelay({ taskId: 1, kind: "END_OVERDUE", days: 3 }),
          makeDelay({ taskId: 2, taskName: "詳細設計", kind: "START_OVERDUE", days: 2 }),
          makeDelay({ taskId: 3, taskName: "結合テスト", kind: "DUE_SOON", days: 0 }),
          makeDelay({ taskId: 4, taskName: "単体テスト", kind: "DUE_SOON", days: 2 }),
        ]}
        dueSoonDays={2}
      />
    );

    expect(screen.getByText("終了遅れ 3日")).toBeInTheDocument();
    expect(screen.getByText("開始遅れ 2日")).toBeInTheDocument();
    expect(screen.getByText("本日期限")).toBeInTheDocument();
    expect(screen.getByText("残り2日")).toBeInTheDocument();
    expect(screen.getByText("4件")).toBeInTheDocument();
  });

  it("担当者で絞り込める", async () => {
    const user = userEvent.setup();
    render(
      <TaskDelayList
        delays={[
          makeDelay({ taskId: 1, taskName: "設計A", assigneeId: 7, assigneeName: "山田" }),
          makeDelay({ taskId: 2, taskName: "設計B", assigneeId: 8, assigneeName: "佐藤" }),
        ]}
        dueSoonDays={1}
      />
    );

    await user.click(screen.getByRole("combobox", { name: "担当者で絞り込み" }));
    await user.click(screen.getByRole("option", { name: "佐藤" }));

    expect(screen.queryByText("設計A")).not.toBeInTheDocument();
    expect(screen.getByText("設計B")).toBeInTheDocument();
    expect(screen.getByText("1件")).toBeInTheDocument();
  });

  it("対象がなければ何も表示しない", () => {
    const { container } = render(<TaskDelayList delays={[]} dueSoonDays={1} />);
    expect(container).toBeEmptyDOMElement();
  });
});
