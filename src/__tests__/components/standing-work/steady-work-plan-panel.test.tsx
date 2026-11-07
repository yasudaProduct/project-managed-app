import React from "react";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import "@testing-library/jest-dom";
import { SteadyWorkPlanPanel } from "@/components/standing-work/steady-work-plan-panel";
import type { SteadyWorkTaskDto } from "@/types/steady-work-plan";

jest.mock("@/app/wbs/[id]/actions/steady-work-plan-actions", () => ({
  listSteadyWorkTasks: jest.fn(),
  createSteadyWorkTask: jest.fn(),
  createSteadyWorkPlan: jest.fn(),
  updateSteadyWorkPlan: jest.fn(),
  deleteSteadyWorkPlan: jest.fn(),
}));
jest.mock("@/hooks/use-toast", () => ({ toast: jest.fn() }));

import {
  listSteadyWorkTasks,
  createSteadyWorkTask,
  createSteadyWorkPlan,
  deleteSteadyWorkPlan,
} from "@/app/wbs/[id]/actions/steady-work-plan-actions";

const mockList = listSteadyWorkTasks as jest.Mock;
const mockCreateTask = createSteadyWorkTask as jest.Mock;
const mockCreatePlan = createSteadyWorkPlan as jest.Mock;
const mockDeletePlan = deleteSteadyWorkPlan as jest.Mock;

// jsdom に無い API（Radix が要求）をスタブ
beforeAll(() => {
  Element.prototype.scrollIntoView = jest.fn();
  Element.prototype.hasPointerCapture = jest.fn().mockReturnValue(false);
  Element.prototype.releasePointerCapture = jest.fn();
  global.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
});

const tasks: SteadyWorkTaskDto[] = [
  {
    taskId: 1,
    taskNo: "STD-1",
    name: "保守対応",
    assignee: { id: 300, userId: "user-1", displayName: "山田" },
    plans: [
      { id: 10, taskId: 1, unit: "PER_DAY", hours: 2, validFrom: "2026-04-01T00:00:00.000Z", validTo: "2026-09-30T00:00:00.000Z" },
      { id: 11, taskId: 1, unit: "PER_MONTH", hours: 20, validFrom: "2026-10-01T00:00:00.000Z", validTo: null },
    ],
  },
  { taskId: 2, taskNo: "STD-2", name: "社内雑務", assignee: null, plans: [] },
];

/** 定常枠タブ（docs/plans/non-project-work-management.md §6.7） */
describe("SteadyWorkPlanPanel", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockList.mockResolvedValue(tasks);
  });

  it("タスクごとに担当者と定常枠（単位・時間・有効期間）を表示する", () => {
    render(<SteadyWorkPlanPanel wbsId={5} initialTasks={tasks} assignees={[{ id: 300, displayName: "山田" }]} />);

    const maintenance = screen.getByRole("row", { name: /保守対応/ });
    expect(maintenance).toHaveTextContent("STD-1");
    expect(maintenance).toHaveTextContent("山田");
    expect(maintenance).toHaveTextContent("2 h/日");
    expect(maintenance).toHaveTextContent("2026/04/01 〜 2026/09/30");
    expect(maintenance).toHaveTextContent("20 h/月");
    expect(maintenance).toHaveTextContent("2026/10/01 〜 無期限");

    const chores = screen.getByRole("row", { name: /社内雑務/ });
    expect(chores).toHaveTextContent("未割当");
    expect(chores).toHaveTextContent("定常枠なし");
  });

  it("担当者のいないタスクでは「枠を追加」を押せない", () => {
    render(<SteadyWorkPlanPanel wbsId={5} initialTasks={tasks} assignees={[{ id: 300, displayName: "山田" }]} />);

    const chores = screen.getByRole("row", { name: /社内雑務/ });
    expect(within(chores).getByRole("button", { name: "枠を追加" })).toBeDisabled();
    const maintenance = screen.getByRole("row", { name: /保守対応/ });
    expect(within(maintenance).getByRole("button", { name: "枠を追加" })).toBeEnabled();
  });

  it("「枠を追加」から単位・時間・有効期間を入力して定常枠を作成し、一覧を再取得する", async () => {
    mockCreatePlan.mockResolvedValue({ success: true, data: { id: 12 } });
    render(<SteadyWorkPlanPanel wbsId={5} initialTasks={tasks} assignees={[{ id: 300, displayName: "山田" }]} />);

    const maintenance = screen.getByRole("row", { name: /保守対応/ });
    fireEvent.click(within(maintenance).getByRole("button", { name: "枠を追加" }));

    const dialog = await screen.findByRole("dialog");
    fireEvent.click(within(dialog).getByLabelText("h/月"));
    fireEvent.change(within(dialog).getByLabelText("時間"), { target: { value: "20" } });
    fireEvent.change(within(dialog).getByLabelText("開始日"), { target: { value: "2026/04/01" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "保存" }));

    await waitFor(() => {
      expect(mockCreatePlan).toHaveBeenCalledWith({
        wbsId: 5,
        taskId: 1,
        unit: "PER_MONTH",
        hours: 20,
        validFrom: "2026-04-01",
        validTo: null,
      });
    });
    await waitFor(() => expect(mockList).toHaveBeenCalledWith(5));
  });

  it("「定常タスクを追加」から名前だけで定常タスクを作成できる", async () => {
    mockCreateTask.mockResolvedValue({ success: true, data: { id: 3 } });
    render(<SteadyWorkPlanPanel wbsId={5} initialTasks={tasks} assignees={[{ id: 300, displayName: "山田" }]} />);

    fireEvent.click(screen.getByRole("button", { name: "定常タスクを追加" }));

    const dialog = await screen.findByRole("dialog");
    fireEvent.change(within(dialog).getByLabelText("タスク名"), { target: { value: "問い合わせ対応" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "追加" }));

    await waitFor(() => {
      expect(mockCreateTask).toHaveBeenCalledWith({ wbsId: 5, name: "問い合わせ対応", assigneeId: undefined });
    });
    await waitFor(() => expect(mockList).toHaveBeenCalledWith(5));
  });

  it("「削除」は確認のうえで定常枠を削除し、一覧を再取得する", async () => {
    mockDeletePlan.mockResolvedValue({ success: true, data: undefined });
    render(<SteadyWorkPlanPanel wbsId={5} initialTasks={tasks} assignees={[{ id: 300, displayName: "山田" }]} />);

    const maintenance = screen.getByRole("row", { name: /保守対応/ });
    fireEvent.click(within(maintenance).getAllByRole("button", { name: "削除" })[0]);

    const confirm = await screen.findByRole("alertdialog");
    fireEvent.click(within(confirm).getByRole("button", { name: "削除する" }));

    await waitFor(() => {
      expect(mockDeletePlan).toHaveBeenCalledWith({ wbsId: 5, id: 10 });
    });
    await waitFor(() => expect(mockList).toHaveBeenCalledWith(5));
  });

  it("作成に失敗したらエラーをトーストで知らせ、一覧は再取得しない", async () => {
    const { toast } = jest.requireMock("@/hooks/use-toast") as { toast: jest.Mock };
    mockCreatePlan.mockResolvedValue({ success: false, error: "定常枠の有効期間が重なっています" });
    render(<SteadyWorkPlanPanel wbsId={5} initialTasks={tasks} assignees={[{ id: 300, displayName: "山田" }]} />);

    const maintenance = screen.getByRole("row", { name: /保守対応/ });
    fireEvent.click(within(maintenance).getByRole("button", { name: "枠を追加" }));
    const dialog = await screen.findByRole("dialog");
    fireEvent.change(within(dialog).getByLabelText("時間"), { target: { value: "1" } });
    fireEvent.change(within(dialog).getByLabelText("開始日"), { target: { value: "2026/04/01" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "保存" }));

    await waitFor(() => {
      expect(toast).toHaveBeenCalledWith(
        expect.objectContaining({ description: "定常枠の有効期間が重なっています", variant: "destructive" })
      );
    });
    expect(mockList).not.toHaveBeenCalled();
  });
});
