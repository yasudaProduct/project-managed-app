import { describe, it, expect, jest } from "@jest/globals";
import { render, screen } from "@testing-library/react";
import { TaskDetailSidebar } from "@/components/ganttv3/TaskDetailSidebar";
import { Task } from "@/components/ganttv3/gantt";

const task: Task = {
  id: "1",
  name: "詳細設計タスク",
  startDate: new Date("2024-01-01T00:00:00Z"),
  endDate: new Date("2024-01-11T00:00:00Z"),
  duration: 10,
  color: "#000000",
  isMilestone: false,
  progress: 0,
  predecessors: [],
  level: 0,
  isManuallyScheduled: true,
  category: "設計",
  assignee: "山田太郎",
  status: "IN_PROGRESS",
  yoteiKosu: 40,
  jissekiKosu: 25,
  forecastKosu: 45,
  jissekiStart: new Date("2024-01-02T00:00:00Z"),
  jissekiEnd: new Date("2024-01-09T00:00:00Z"),
};

describe("TaskDetailSidebar", () => {
  it("実績工数と見通し工数を表示する", () => {
    render(<TaskDetailSidebar task={task} onClose={jest.fn()} />);

    // 各セクションの見出し
    expect(screen.getByText("実績工数")).toBeInTheDocument();
    expect(screen.getByText("見通し工数")).toBeInTheDocument();
    expect(screen.getByText("予定工数")).toBeInTheDocument();

    // 値
    expect(screen.getByText("25h")).toBeInTheDocument(); // 実績
    expect(screen.getByText("45h")).toBeInTheDocument(); // 見通し
    expect(screen.getByText("40h")).toBeInTheDocument(); // 予定
  });

  it("タスク未選択時は何も表示しない", () => {
    const { container } = render(
      <TaskDetailSidebar task={null} onClose={jest.fn()} />
    );
    expect(container).toBeEmptyDOMElement();
  });
});
