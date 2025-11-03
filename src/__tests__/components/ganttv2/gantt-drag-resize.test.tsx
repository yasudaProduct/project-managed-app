import React from "react";
import { render, waitFor, fireEvent, act } from "@testing-library/react";
import "@testing-library/jest-dom";
import GanttV2Component from "@/components/ganttv2/gantt-v2";
import {
  createMockProject,
  createTaskWithPeriod,
} from "@/__tests__/helpers/gantt-test-helpers";
import { WbsTask, Milestone } from "@/types/wbs";

// ResizeObserver のモック
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// scrollIntoView のモック
HTMLElement.prototype.scrollIntoView = jest.fn();

// scrollLeft プロパティの定義（テスト中に参照される）
Object.defineProperty(HTMLElement.prototype, "scrollLeft", {
  get: function () {
    return this._scrollLeft || 0;
  },
  set: function (val) {
    this._scrollLeft = val;
  },
});

// updateTask をモック
jest.mock("@/app/wbs/[id]/wbs-task-actions", () => ({
  __esModule: true,
  updateTask: jest.fn().mockResolvedValue({ success: true }),
}));

describe("GanttV2Component - ドラッグ/リサイズ", () => {
  const project = createMockProject({
    startDate: new Date("2024-05-01"),
    endDate: new Date("2024-05-31"),
  });

  const tasks: WbsTask[] = [
    createTaskWithPeriod(1, "2024-05-09", "2024-05-16", {
      name: "ドラッグ対象",
    }),
  ];

  const milestones: Milestone[] = [];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("タスクバーをドラッグして保存が呼ばれる", async () => {
    const { container } = render(
      <GanttV2Component
        tasks={tasks}
        milestones={milestones}
        project={project}
        wbsId={1}
        onTaskUpdate={jest.fn()}
      />
    );

    // タスクバーの取得
    const taskBar = container.querySelector(
      '[data-task-id="1"]'
    ) as HTMLElement;
    expect(taskBar).toBeInTheDocument();

    // チャートスクロール要素（chartScrollRef）を取得し、境界をモック
    const scrollEl = taskBar.closest(".overflow-auto") as HTMLElement;
    expect(scrollEl).toBeTruthy();
    scrollEl.getBoundingClientRect = () => ({
      left: 0,
      top: 0,
      right: 1200,
      bottom: 600,
      width: 1200,
      height: 600,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    });

    // タスクバー自身の rect も最低限モック
    taskBar.getBoundingClientRect = () => ({
      left: 0,
      top: 0,
      right: 200,
      bottom: 24,
      width: 200,
      height: 24,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    });

    // mousedown -> mousemove（しきい値超え） -> mouseup
    await act(async () => {
      fireEvent.mouseDown(taskBar, { clientX: 100, clientY: 100 });
    });

    await act(async () => {
      fireEvent.mouseMove(document, { clientX: 140, clientY: 100 });
    });

    await act(async () => {
      fireEvent.mouseUp(document, { clientX: 140, clientY: 100 });
    });

    const { updateTask } = await import(
      "@/app/wbs/[id]/actions/wbs-task-actions"
    );
    await waitFor(() => {
      expect(updateTask).toHaveBeenCalled();
    });
  });

  test("右端ハンドルのリサイズで保存が呼ばれる", async () => {
    const { container } = render(
      <GanttV2Component
        tasks={tasks}
        milestones={milestones}
        project={project}
        wbsId={1}
        onTaskUpdate={jest.fn()}
      />
    );

    const taskBar = container.querySelector(
      '[data-task-id="1"]'
    ) as HTMLElement;
    expect(taskBar).toBeInTheDocument();

    // チャートスクロール要素（chartScrollRef）境界モック
    const scrollEl = taskBar.closest(".overflow-auto") as HTMLElement;
    expect(scrollEl).toBeTruthy();
    scrollEl.getBoundingClientRect = () => ({
      left: 0,
      top: 0,
      right: 1200,
      bottom: 600,
      width: 1200,
      height: 600,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    });

    // 右端ハンドル取得（right-0 + cursor-col-resize の要素）
    const rightHandle = taskBar.querySelector(
      ".right-0.cursor-col-resize"
    ) as HTMLElement;
    expect(rightHandle).toBeInTheDocument();

    // mousedown -> mousemove -> mouseup
    await act(async () => {
      fireEvent.mouseDown(rightHandle, { clientX: 100, clientY: 100 });
    });

    await act(async () => {
      fireEvent.mouseMove(document, { clientX: 180, clientY: 100 });
    });

    await act(async () => {
      fireEvent.mouseUp(document, { clientX: 180, clientY: 100 });
    });

    const { updateTask } = await import(
      "@/app/wbs/[id]/actions/wbs-task-actions"
    );
    await waitFor(() => {
      expect(updateTask).toHaveBeenCalled();
    });
  });
});
