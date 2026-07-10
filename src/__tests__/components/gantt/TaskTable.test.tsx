import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import {
  TaskTable,
  TaskTableColumn,
} from "@/components/gantt/task-table";
import { makeTask } from "./_fixtures";

const columns: TaskTableColumn[] = [
  { key: "name", header: "タスク名", renderCell: (t) => t.name },
  {
    key: "action",
    header: "操作",
    interactive: true,
    renderCell: (t) => <button>編集:{t.id}</button>,
  },
];

const tasks = [
  makeTask({ id: "1", name: "設計書作成" }),
  makeTask({ id: "2", name: "実装" }),
];

describe("TaskTable", () => {
  it("列定義に従いヘッダーとセルを描画する", () => {
    render(<TaskTable tasks={tasks} columns={columns} />);
    expect(screen.getByText("タスク名")).toBeInTheDocument();
    expect(screen.getByText("操作")).toBeInTheDocument();
    expect(screen.getByText("設計書作成")).toBeInTheDocument();
    expect(screen.getByText("実装")).toBeInTheDocument();
  });

  it("タスクが空のとき emptyMessage を表示する", () => {
    render(<TaskTable tasks={[]} columns={columns} />);
    expect(screen.getByText("タスクがありません。")).toBeInTheDocument();
  });

  it("行クリックで onRowActivate がそのタスクで発火", () => {
    const onRowActivate = jest.fn();
    render(
      <TaskTable tasks={tasks} columns={columns} onRowActivate={onRowActivate} />,
    );
    fireEvent.click(screen.getByText("設計書作成"));
    expect(onRowActivate).toHaveBeenCalledWith(
      expect.objectContaining({ id: "1" }),
    );
  });

  it("interactive セル内のクリックは行クリックへ伝播しない", () => {
    const onRowActivate = jest.fn();
    render(
      <TaskTable tasks={tasks} columns={columns} onRowActivate={onRowActivate} />,
    );
    fireEvent.click(screen.getByText("編集:1"));
    expect(onRowActivate).not.toHaveBeenCalled();
  });

  it("selectable: ヘッダーのチェックで全選択・全選択時は解除", () => {
    const onSelectionChange = jest.fn();
    const { rerender } = render(
      <TaskTable
        tasks={tasks}
        columns={columns}
        selectable
        selectedTaskIds={new Set()}
        onSelectionChange={onSelectionChange}
      />,
    );
    const headerCheckbox = screen.getAllByRole("checkbox")[0];
    fireEvent.click(headerCheckbox);
    expect(onSelectionChange).toHaveBeenLastCalledWith(new Set(["1", "2"]));

    rerender(
      <TaskTable
        tasks={tasks}
        columns={columns}
        selectable
        selectedTaskIds={new Set(["1", "2"])}
        onSelectionChange={onSelectionChange}
      />,
    );
    fireEvent.click(screen.getAllByRole("checkbox")[0]);
    expect(onSelectionChange).toHaveBeenLastCalledWith(new Set());
  });

  it("selectable: 行チェックボックスで個別にトグルする", () => {
    const onSelectionChange = jest.fn();
    render(
      <TaskTable
        tasks={tasks}
        columns={columns}
        selectable
        selectedTaskIds={new Set(["1"])}
        onSelectionChange={onSelectionChange}
      />,
    );
    const [, row1, row2] = screen.getAllByRole("checkbox");
    fireEvent.click(row2); // 未選択 → 追加
    expect(onSelectionChange).toHaveBeenLastCalledWith(new Set(["1", "2"]));
    fireEvent.click(row1); // 選択済み → 解除
    expect(onSelectionChange).toHaveBeenLastCalledWith(new Set());
  });

  it("getRowClassName が行に適用される", () => {
    render(
      <TaskTable
        tasks={tasks}
        columns={columns}
        getRowClassName={(t) => (t.id === "1" ? "row-critical" : "")}
      />,
    );
    expect(screen.getByText("設計書作成").closest("tr")!.className).toContain(
      "row-critical",
    );
    expect(screen.getByText("実装").closest("tr")!.className).not.toContain(
      "row-critical",
    );
  });
});
