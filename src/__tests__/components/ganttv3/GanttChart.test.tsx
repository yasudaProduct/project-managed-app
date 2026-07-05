import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import { GanttChart } from "@/components/ganttv3/gantt-chart";
import { makeTask, makePhase, makeStyle } from "./_fixtures";

// jsdom 非対応のスクロールAPIのポリフィル（ナビゲーション操作で使用）
window.HTMLElement.prototype.scrollTo = jest.fn();
window.HTMLElement.prototype.scrollBy = jest.fn();

// day スケール・zoom=1 では columnWidth=40px/日（ドラッグ量→日数の換算に使用）
const PX_PER_DAY = 40;

const tasks = [
  makeTask({
    id: "1",
    name: "タスクA",
    category: "設計",
    startDate: new Date("2024-01-01T00:00:00.000Z"),
    endDate: new Date("2024-01-03T00:00:00.000Z"),
  }),
  makeTask({
    id: "2",
    name: "タスクB",
    category: "設計",
    startDate: new Date("2024-01-05T00:00:00.000Z"),
    endDate: new Date("2024-01-10T00:00:00.000Z"),
  }),
];

const defaultProps = {
  tasks,
  categories: [makePhase({ id: "p1", name: "設計" })],
  timelineScale: "day" as const,
  style: makeStyle({ showDependencies: false, showTodayLine: false }),
  expandedCategories: new Set(["設計"]),
  groupBy: "phase" as const,
  onTaskUpdate: jest.fn(),
  onCategoryToggle: jest.fn(),
};

beforeEach(() => jest.clearAllMocks());

/** バー本体(rect)を data-task-id で取得して mousedown を発火する */
function mouseDownOnBar(
  container: HTMLElement,
  taskId: string,
  clientX: number,
) {
  const bar = container.querySelector(`[data-task-id="${taskId}"] rect`);
  expect(bar).not.toBeNull();
  fireEvent.mouseDown(bar!, { clientX });
}

describe("GanttChart", () => {
  describe("描画", () => {
    it("展開中カテゴリのタスクバーを data-task-id 付きで描画する", () => {
      const { container } = render(<GanttChart {...defaultProps} />);
      expect(container.querySelectorAll("[data-task-id]")).toHaveLength(2);
      expect(
        container.querySelector('[data-task-id="1"]'),
      ).toBeInTheDocument();
    });

    it("カテゴリが折りたたまれているとタスクバー・タスク行を描画しない", () => {
      const { container } = render(
        <GanttChart {...defaultProps} expandedCategories={new Set()} />,
      );
      expect(container.querySelectorAll("[data-task-id]")).toHaveLength(0);
      expect(screen.queryByText("タスクA")).not.toBeInTheDocument();
      // カテゴリ行自体は表示される
      expect(screen.getByText("設計")).toBeInTheDocument();
    });

    it("タスク名を表示する（タスクリスト行とバー横ラベルの2箇所）", () => {
      render(<GanttChart {...defaultProps} />);
      expect(screen.getAllByText("タスクA")).toHaveLength(2);
      expect(screen.getAllByText("タスクB")).toHaveLength(2);
    });

    it("カテゴリ行のクリックで onCategoryToggle が発火", () => {
      render(<GanttChart {...defaultProps} />);
      fireEvent.click(screen.getByText("設計"));
      expect(defaultProps.onCategoryToggle).toHaveBeenCalledWith("設計");
    });

    it("ズーム率を表示する", () => {
      render(<GanttChart {...defaultProps} zoomLevel={1.5} />);
      expect(screen.getByText("Zoom: 150%")).toBeInTheDocument();
    });
  });

  describe("ズーム操作", () => {
    it("ズームイン/アウトで onZoomChange が 1.2倍/÷1.2 で発火", () => {
      const onZoomChange = jest.fn();
      const { container } = render(
        <GanttChart
          {...defaultProps}
          zoomLevel={1.0}
          onZoomChange={onZoomChange}
        />,
      );

      fireEvent.click(
        container.querySelector(".lucide-zoom-in")!.closest("button")!,
      );
      expect(onZoomChange).toHaveBeenLastCalledWith(1.2);

      fireEvent.click(
        container.querySelector(".lucide-zoom-out")!.closest("button")!,
      );
      expect(onZoomChange.mock.calls[1][0]).toBeCloseTo(1 / 1.2, 5);
    });
  });

  describe("編集モードの切替UI", () => {
    it("非編集時は編集モードボタンを表示し、クリックで onEnterEditMode", () => {
      const onEnterEditMode = jest.fn();
      render(
        <GanttChart {...defaultProps} onEnterEditMode={onEnterEditMode} />,
      );
      fireEvent.click(screen.getByTestId("ganttv3-edit-toggle"));
      expect(onEnterEditMode).toHaveBeenCalled();
    });

    it("初回データ読込中（isDataLoading）は編集モードボタンが無効", () => {
      // 読込前に編集モードへ入ると空ドラフトが固定される問題の回帰テスト
      render(
        <GanttChart
          {...defaultProps}
          onEnterEditMode={jest.fn()}
          isDataLoading
        />,
      );
      expect(screen.getByTestId("ganttv3-edit-toggle")).toBeDisabled();
    });

    it("編集中は保存/キャンセルを表示し、各コールバックが発火", () => {
      const onSaveEdit = jest.fn();
      const onCancelEdit = jest.fn();
      render(
        <GanttChart
          {...defaultProps}
          editMode
          onSaveEdit={onSaveEdit}
          onCancelEdit={onCancelEdit}
        />,
      );
      expect(
        screen.queryByTestId("ganttv3-edit-toggle"),
      ).not.toBeInTheDocument();

      fireEvent.click(screen.getByTestId("ganttv3-edit-save"));
      expect(onSaveEdit).toHaveBeenCalled();
      fireEvent.click(screen.getByTestId("ganttv3-edit-cancel"));
      expect(onCancelEdit).toHaveBeenCalled();
    });

    it("保存中は保存ボタンが「保存中...」表示かつ無効", () => {
      render(
        <GanttChart {...defaultProps} editMode onSaveEdit={jest.fn()} isSaving />,
      );
      const save = screen.getByTestId("ganttv3-edit-save");
      expect(save).toHaveTextContent("保存中...");
      expect(save).toBeDisabled();
    });
  });

  describe("バーのドラッグ（編集モード）", () => {
    it("バーを右へドラッグすると開始・終了が同日数シフトして onTaskUpdate", () => {
      const onTaskUpdate = jest.fn();
      const { container } = render(
        <GanttChart {...defaultProps} editMode onTaskUpdate={onTaskUpdate} />,
      );

      mouseDownOnBar(container, "1", 100);
      fireEvent.mouseMove(document, { clientX: 100 + PX_PER_DAY * 2 });
      fireEvent.mouseUp(document);

      expect(onTaskUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          id: "1",
          startDate: new Date("2024-01-03T00:00:00.000Z"),
          endDate: new Date("2024-01-05T00:00:00.000Z"),
        }),
      );
    });

    it("右端リサイズは終了日のみ伸ばす", () => {
      const onTaskUpdate = jest.fn();
      const { container } = render(
        <GanttChart {...defaultProps} editMode onTaskUpdate={onTaskUpdate} />,
      );

      // リサイズハンドルはホバー時のみ表示
      const group = container.querySelector('[data-task-id="1"]')!;
      fireEvent.mouseEnter(group);
      const handles = group.querySelectorAll(".cursor-ew-resize");
      expect(handles).toHaveLength(2);

      fireEvent.mouseDown(handles[1], { clientX: 200 }); // 右ハンドル
      fireEvent.mouseMove(document, { clientX: 200 + PX_PER_DAY });
      fireEvent.mouseUp(document);

      expect(onTaskUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          id: "1",
          startDate: new Date("2024-01-01T00:00:00.000Z"), // 不変
          endDate: new Date("2024-01-04T00:00:00.000Z"), // +1日
        }),
      );
    });

    it("右端リサイズで開始日より前へは縮められない（開始日でクランプ）", () => {
      const onTaskUpdate = jest.fn();
      const { container } = render(
        <GanttChart {...defaultProps} editMode onTaskUpdate={onTaskUpdate} />,
      );

      const group = container.querySelector('[data-task-id="1"]')!;
      fireEvent.mouseEnter(group);
      const handles = group.querySelectorAll(".cursor-ew-resize");

      // 期間2日のタスクを5日分左へ縮める → endDate は startDate まで
      fireEvent.mouseDown(handles[1], { clientX: 500 });
      fireEvent.mouseMove(document, { clientX: 500 - PX_PER_DAY * 5 });
      fireEvent.mouseUp(document);

      expect(onTaskUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          startDate: new Date("2024-01-01T00:00:00.000Z"),
          endDate: new Date("2024-01-01T00:00:00.000Z"),
        }),
      );
    });

    it("非編集モードではドラッグしても onTaskUpdate が発火しない", () => {
      const onTaskUpdate = jest.fn();
      const { container } = render(
        <GanttChart
          {...defaultProps}
          editMode={false}
          onTaskUpdate={onTaskUpdate}
        />,
      );

      mouseDownOnBar(container, "1", 100);
      fireEvent.mouseMove(document, { clientX: 100 + PX_PER_DAY * 2 });
      fireEvent.mouseUp(document);

      expect(onTaskUpdate).not.toHaveBeenCalled();
    });
  });

  describe("インライン編集パネル（編集モード）", () => {
    it("バーをクリック（移動なし）で選択するとパネルが開く", () => {
      const { container } = render(<GanttChart {...defaultProps} editMode />);
      expect(screen.queryByText("予定開始日")).not.toBeInTheDocument();

      mouseDownOnBar(container, "1", 100);
      fireEvent.mouseUp(document);

      expect(screen.getByText("予定開始日")).toBeInTheDocument();
      expect(screen.getByText("予定工数(h)")).toBeInTheDocument();
    });

    it("パネルの工数変更が onTaskUpdate に部分パッチで反映される", () => {
      const onTaskUpdate = jest.fn();
      const { container } = render(
        <GanttChart {...defaultProps} editMode onTaskUpdate={onTaskUpdate} />,
      );

      mouseDownOnBar(container, "1", 100);
      fireEvent.mouseUp(document);

      const kosuInput = screen
        .getByText("予定工数(h)")
        .querySelector("input")!;
      fireEvent.change(kosuInput, { target: { value: "16" } });

      expect(onTaskUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ id: "1", duration: 16 }),
      );
    });
  });
});
