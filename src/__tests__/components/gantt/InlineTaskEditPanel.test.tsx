import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import { InlineTaskEditPanel } from "@/components/gantt/inline-task-edit-panel";
import { makeTask } from "./_fixtures";

const assignees = [
  { id: 1, name: "山田" },
  { id: 2, name: "鈴木" },
];

function setup(taskOverrides = {}, extraProps = {}) {
  const onChange = jest.fn();
  const onClose = jest.fn();
  const onEditDependencies = jest.fn();
  const task = makeTask({
    id: "1",
    name: "実装",
    taskNo: "P-0001",
    startDate: new Date("2024-03-01T00:00:00.000Z"),
    endDate: new Date("2024-03-05T00:00:00.000Z"),
    duration: 4,
    ...taskOverrides,
  });
  render(
    <InlineTaskEditPanel
      task={task}
      assignees={assignees}
      onChange={onChange}
      onEditDependencies={onEditDependencies}
      onClose={onClose}
      {...extraProps}
    />,
  );
  return { onChange, onClose, onEditDependencies, task };
}

describe("InlineTaskEditPanel", () => {
  it("タスク名/番号を表示し、通常タスクは終了日・工数・進捗率・担当者入力を出す", () => {
    setup();
    expect(screen.getByText(/実装/)).toBeInTheDocument();
    expect(screen.getByText("予定開始日")).toBeInTheDocument();
    expect(screen.getByText("予定終了日")).toBeInTheDocument();
    expect(screen.getByText("予定工数(h)")).toBeInTheDocument();
    expect(screen.getByText("進捗率(%)")).toBeInTheDocument();
    expect(screen.getByText("担当者")).toBeInTheDocument();
  });

  it("開始日変更で onChange に開始日が渡る", () => {
    const { onChange } = setup();
    fireEvent.change(screen.getByDisplayValue("2024-03-01"), {
      target: { value: "2024-03-02" },
    });
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        startDate: new Date("2024-03-02T00:00:00.000Z"),
      }),
    );
  });

  it("工数変更で onChange に duration が渡る", () => {
    const { onChange } = setup();
    fireEvent.change(screen.getByDisplayValue("4"), {
      target: { value: "8" },
    });
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ duration: 8 }),
    );
  });

  it("担当者選択で assigneeId と名前が onChange に渡る", () => {
    const { onChange } = setup();
    fireEvent.change(screen.getByRole("combobox"), {
      target: { value: "2" },
    });
    expect(onChange).toHaveBeenCalledWith({ assigneeId: 2, assignee: "鈴木" });
  });

  it("進捗率変更で onChange に progressRate が渡る", () => {
    const { onChange } = setup({ progressRate: 30 });
    fireEvent.change(screen.getByDisplayValue("30"), {
      target: { value: "70" },
    });
    expect(onChange).toHaveBeenCalledWith({ progressRate: 70 });
  });

  it("進捗率は0-100にクランプされる", () => {
    const { onChange } = setup({ progressRate: 30 });
    fireEvent.change(screen.getByDisplayValue("30"), {
      target: { value: "150" },
    });
    expect(onChange).toHaveBeenCalledWith({ progressRate: 100 });
  });

  it("進捗率を空にすると undefined（未変更扱い）が渡る", () => {
    const { onChange } = setup({ progressRate: 30 });
    fireEvent.change(screen.getByDisplayValue("30"), {
      target: { value: "" },
    });
    expect(onChange).toHaveBeenCalledWith({ progressRate: undefined });
  });

  it("閉じるボタンで onClose", () => {
    const { onClose } = setup();
    fireEvent.click(screen.getByTitle("閉じる"));
    expect(onClose).toHaveBeenCalled();
  });

  it("マイルストーンは終了日・工数・担当者を出さず、予定日のみ", () => {
    setup({ isMilestone: true });
    expect(screen.getByText("予定日")).toBeInTheDocument();
    expect(screen.queryByText("予定終了日")).not.toBeInTheDocument();
    expect(screen.queryByText("予定工数(h)")).not.toBeInTheDocument();
    expect(screen.queryByText("担当者")).not.toBeInTheDocument();
  });

  it("onDelete未指定では削除ボタンを表示しない", () => {
    setup();
    expect(screen.queryByText("削除")).not.toBeInTheDocument();
  });

  it("onDelete指定時は削除ボタンを表示し、クリックで発火する", () => {
    const onDelete = jest.fn();
    setup({}, { onDelete });
    fireEvent.click(screen.getByText("削除"));
    expect(onDelete).toHaveBeenCalledTimes(1);
  });
});
