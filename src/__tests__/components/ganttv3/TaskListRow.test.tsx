import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { TaskListRow } from "@/components/ganttv3/task-list-row";
import { makeTask } from "./_fixtures";

describe("TaskListRow", () => {
  it("通常タスク: 名前/taskNo/担当者/期間(h)を表示", () => {
    const task = makeTask({
      id: "1",
      name: "設計",
      taskNo: "P-0001",
      assignee: "山田",
      duration: 4,
    });
    render(<TaskListRow task={task} top={0} height={20} />);
    expect(screen.getByText("設計")).toBeInTheDocument();
    expect(screen.getByText("P-0001")).toBeInTheDocument();
    expect(screen.getByText("山田")).toBeInTheDocument();
    expect(screen.getByText("4h")).toBeInTheDocument();
  });

  it("マイルストーン: 期間に M を表示", () => {
    const task = makeTask({ id: "1", name: "MS", isMilestone: true });
    render(<TaskListRow task={task} top={0} height={20} />);
    expect(screen.getByText("M")).toBeInTheDocument();
  });

  it("top/height を style に反映する", () => {
    const task = makeTask({ id: "1", name: "T" });
    const { container } = render(<TaskListRow task={task} top={40} height={24} />);
    const row = container.firstChild as HTMLElement;
    expect(row.style.top).toBe("40px");
    expect(row.style.height).toBe("24px");
  });

  it("barColor 指定時は先頭ドットの色に使われる（task.colorより優先）", () => {
    const task = makeTask({ id: "1", name: "T", color: "#000000" });
    const { container } = render(
      <TaskListRow task={task} top={0} height={20} barColor="#3B82F6" />,
    );
    const dot = container.querySelector(".w-2.h-2");
    expect(dot).toHaveStyle({ backgroundColor: "#3B82F6" });
  });
});
