import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";

// jsdom 非対応APIのポリフィル
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));
HTMLElement.prototype.scrollIntoView = jest.fn();

// Server Actions はモック（hook 自体は実物を使い配線を検証する）
jest.mock("@/app/wbs/[id]/ganttv3/actions", () => ({
  getGanttTasks: jest.fn(),
  getPhases: jest.fn(),
  getAssigneeOptions: jest.fn(),
}));
jest.mock("@/app/wbs/[id]/actions/wbs-task-actions", () => ({
  updateTask: jest.fn(),
}));
jest.mock("@/app/wbs/[id]/actions/milestone-actions", () => ({
  updateMilestone: jest.fn(),
}));
jest.mock("@/app/wbs/[id]/ganttv3/dependency-actions", () => ({
  createGanttDependency: jest.fn(),
  deleteGanttDependency: jest.fn(),
}));
jest.mock("@/app/wbs/[id]/ganttv3/export-actions", () => ({
  getGanttTasksTsv: jest.fn(),
}));
jest.mock("@/hooks/use-toast", () => ({ toast: jest.fn() }));

// 子コンポーネントは軽量モック（GanttChart は jsdom 非対応APIを多用するため）。
// GanttV3Client は barrel ではなく各ファイルから直接 import しているため、
// モックも各モジュールパスに対して行う。
jest.mock("@/components/ganttv3/gantt-chart", () => ({
  GanttChart: ({
    tasks,
    onEditDependencies,
  }: {
    tasks: unknown[];
    onEditDependencies: (id: string) => void;
  }) => (
    <div data-testid="gantt-chart">
      <span>gantt-tasks:{tasks.length}</span>
      <button onClick={() => onEditDependencies("1")}>edit-deps</button>
    </div>
  ),
}));
jest.mock("@/components/ganttv3/view-switcher", () => ({
  ViewSwitcher: ({
    onViewChange,
  }: {
    onViewChange: (v: "gantt" | "table") => void;
  }) => (
    <div>
      <button onClick={() => onViewChange("gantt")}>to-gantt</button>
      <button onClick={() => onViewChange("table")}>to-table</button>
    </div>
  ),
}));
jest.mock("@/components/ganttv3/quick-actions", () => ({
  QuickActions: () => <div data-testid="quick-actions" />,
}));
jest.mock("@/components/ganttv3/task-filter-control", () => ({
  TaskFilterControl: () => <div data-testid="task-filter" />,
}));
jest.mock("@/components/ganttv3/task-detail-sidebar", () => ({
  TaskDetailSidebar: () => null,
}));

jest.mock("@/components/ganttv3/task-table", () => ({
  TaskTable: ({ tasks }: { tasks: unknown[] }) => (
    <div data-testid="task-table">table-tasks:{tasks.length}</div>
  ),
}));
jest.mock("@/components/ganttv3/dependency-edit-modal", () => ({
  DependencyEditModal: ({ open }: { open: boolean }) =>
    open ? <div data-testid="dep-modal" /> : null,
}));
jest.mock("@/components/wbs/task-modal", () => ({
  TaskModal: ({ isOpen }: { isOpen: boolean }) =>
    isOpen ? <div data-testid="task-modal" /> : null,
}));

import { GanttV3Client } from "@/components/ganttv3/gantt-v3-client";
import {
  getGanttTasks,
  getPhases,
  getAssigneeOptions,
} from "@/app/wbs/[id]/ganttv3/actions";
import { makeTask, makePhase } from "./_fixtures";

const mockGetGanttTasks = getGanttTasks as jest.Mock;
const mockGetPhases = getPhases as jest.Mock;
const mockGetAssigneeOptions = getAssigneeOptions as jest.Mock;

const sampleTasks = [
  makeTask({ id: "1", name: "タスクA", category: "設計" }),
  makeTask({ id: "2", name: "タスクB", category: "設計" }),
];

beforeEach(() => {
  jest.clearAllMocks();
  mockGetGanttTasks.mockResolvedValue(sampleTasks);
  mockGetPhases.mockResolvedValue([makePhase({ id: "p1", name: "設計" })]);
  mockGetAssigneeOptions.mockResolvedValue([]);
});

describe("GanttV3Client（統合スモーク）", () => {
  it("マウント時に wbsId 指定で tasks/phases/assignees を取得する", async () => {
    render(<GanttV3Client wbsId={42} />);
    await screen.findByTestId("gantt-chart");
    expect(mockGetGanttTasks).toHaveBeenCalledWith(42);
    expect(mockGetPhases).toHaveBeenCalledWith(42);
    expect(mockGetAssigneeOptions).toHaveBeenCalledWith(42);
  });

  it("初期表示は gantt ビューで、取得した tasks が GanttChart へ渡る", async () => {
    render(<GanttV3Client wbsId={1} />);
    expect(await screen.findByText("gantt-tasks:2")).toBeInTheDocument();
    expect(screen.queryByTestId("task-table")).not.toBeInTheDocument();
    // gantt 時のみ「全て展開/閉じる」操作が出る
    expect(screen.getByText("全て展開")).toBeInTheDocument();
    expect(screen.getByText("全て閉じる")).toBeInTheDocument();
  });

  it("table ビューへ切替で TaskTable を表示し、工数単位トグルが出る", async () => {
    render(<GanttV3Client wbsId={1} />);
    await screen.findByTestId("gantt-chart");

    fireEvent.click(screen.getByText("to-table"));

    expect(await screen.findByTestId("task-table")).toBeInTheDocument();
    expect(screen.getByText("table-tasks:2")).toBeInTheDocument();
    expect(screen.queryByTestId("gantt-chart")).not.toBeInTheDocument();
    expect(screen.getByText("工数単位")).toBeInTheDocument();
  });

  it("GanttChart からの依存編集要求で依存モーダルが開く", async () => {
    render(<GanttV3Client wbsId={1} />);
    await screen.findByTestId("gantt-chart");
    expect(screen.queryByTestId("dep-modal")).not.toBeInTheDocument();

    fireEvent.click(screen.getByText("edit-deps"));

    expect(await screen.findByTestId("dep-modal")).toBeInTheDocument();
  });
});
