import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import { createTaskColumns } from "@/components/gantt/taskTableColumns";
import type { Task } from "@/components/gantt/gantt";
import { makeTask, makeDependency } from "./_fixtures";

function baseParams(taskById: Map<string, Task>) {
  return {
    taskById,
    kosuUnit: "hours" as const,
    onEditTask: jest.fn(),
    onEditDependencies: jest.fn(),
    onDuplicate: jest.fn(),
    onDelete: jest.fn(),
  };
}

describe("createTaskColumns", () => {
  it("期待する列が期待順で生成される", () => {
    const cols = createTaskColumns(baseParams(new Map()));
    expect(cols.map((c) => c.key)).toEqual([
      "name",
      "assignee",
      "phase",
      "startDate",
      "endDate",
      "kosu",
      "progress",
      "status",
      "dependencies",
      "actions",
    ]);
  });

  it("dependencies 列は taskById から先行タスク名を引き当てる（Mapルックアップ）", () => {
    const pred = makeTask({ id: "10", name: "先行タスク" });
    const task = makeTask({
      id: "20",
      predecessors: [makeDependency("10", { lag: 2 })],
    });
    const taskById = new Map([[pred.id, pred]]);
    const cols = createTaskColumns(baseParams(taskById));
    const depCol = cols.find((c) => c.key === "dependencies")!;

    render(<>{depCol.renderCell(task)}</>);
    expect(screen.getByText(/先行タスク/)).toBeInTheDocument();
    expect(screen.getByText(/\+2d/)).toBeInTheDocument();
  });

  it("先行が見つからない場合は「不明」と表示", () => {
    const task = makeTask({
      id: "20",
      predecessors: [makeDependency("999")],
    });
    const cols = createTaskColumns(baseParams(new Map()));
    const depCol = cols.find((c) => c.key === "dependencies")!;
    render(<>{depCol.renderCell(task)}</>);
    expect(screen.getByText(/不明/)).toBeInTheDocument();
  });

  it("dependencies 列の追加ボタンで onEditDependencies が発火", () => {
    const params = baseParams(new Map());
    const cols = createTaskColumns(params);
    const depCol = cols.find((c) => c.key === "dependencies")!;
    const { container } = render(<>{depCol.renderCell(makeTask({ id: "5" }))}</>);
    fireEvent.click(container.querySelector("button")!);
    expect(params.onEditDependencies).toHaveBeenCalledWith("5");
  });
});
