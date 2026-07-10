import React from "react";
import { render, screen, fireEvent, within } from "@testing-library/react";
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

  describe("見通しバーの描画", () => {
    const tasksWithForecast = [
      makeTask({
        id: "1",
        name: "タスクA",
        category: "設計",
        startDate: new Date("2024-01-01T00:00:00.000Z"),
        endDate: new Date("2024-01-03T00:00:00.000Z"),
        actualStartDate: new Date("2024-01-02T00:00:00.000Z"),
        actualEndDate: new Date("2024-01-04T00:00:00.000Z"),
        forecastStartDate: new Date("2024-01-02T00:00:00.000Z"),
        forecastEndDate: new Date("2024-01-08T00:00:00.000Z"),
      }),
      makeTask({
        id: "2",
        name: "タスクB",
        category: "設計",
        startDate: new Date("2024-01-05T00:00:00.000Z"),
        endDate: new Date("2024-01-10T00:00:00.000Z"),
      }),
    ];

    it("showForecast ON かつ見通し日付ありのタスクに破線の見通しバーを描画する", () => {
      const { container } = render(
        <GanttChart
          {...defaultProps}
          tasks={tasksWithForecast}
          style={makeStyle({
            showDependencies: false,
            showTodayLine: false,
            showForecast: true,
          })}
        />,
      );
      const bars = container.querySelectorAll(
        '[data-testid="ganttv3-forecast-bar"]',
      );
      // 見通し日付を持つタスクAのみ描画される（タスクBには描画されない）
      expect(bars).toHaveLength(1);
      expect(bars[0].querySelector("rect")).toHaveAttribute(
        "stroke-dasharray",
      );
    });

    it("showForecast OFF では見通しバーを描画しない", () => {
      const { container } = render(
        <GanttChart {...defaultProps} tasks={tasksWithForecast} />,
      );
      expect(
        container.querySelectorAll('[data-testid="ganttv3-forecast-bar"]'),
      ).toHaveLength(0);
    });

    it("showForecast ON でも行の予定バーは通常どおり描画される", () => {
      const { container } = render(
        <GanttChart
          {...defaultProps}
          tasks={tasksWithForecast}
          style={makeStyle({
            showDependencies: false,
            showTodayLine: false,
            showForecast: true,
          })}
        />,
      );
      expect(container.querySelectorAll("[data-task-id]")).toHaveLength(2);
    });
  });

  describe("イナズマ線（進捗線）", () => {
    const DAY = 24 * 60 * 60 * 1000;
    // 基準日(今日)がタイムライン範囲内に入るよう、実行時の現在日を跨ぐ期間にする
    const now = new Date();
    const inazumaTasks = [
      makeTask({
        id: "1",
        name: "タスクA",
        category: "設計",
        startDate: new Date(now.getTime() - 5 * DAY),
        endDate: new Date(now.getTime() + 5 * DAY),
        progress: 30,
      }),
    ];

    it("showProgressLine ON でイナズマ線を描画する", () => {
      const { queryByTestId } = render(
        <GanttChart
          {...defaultProps}
          tasks={inazumaTasks}
          style={makeStyle({
            showDependencies: false,
            showProgressLine: true,
          })}
        />,
      );
      expect(queryByTestId("ganttv3-progress-line")).toBeInTheDocument();
    });

    it("showProgressLine OFF ではイナズマ線を描画しない", () => {
      const { queryByTestId } = render(
        <GanttChart
          {...defaultProps}
          tasks={inazumaTasks}
          style={makeStyle({
            showDependencies: false,
            showProgressLine: false,
          })}
        />,
      );
      expect(queryByTestId("ganttv3-progress-line")).not.toBeInTheDocument();
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

  describe("依存関係のドラッグ作成（編集モード）", () => {
    // タイムライン基点は最小開始日の7日前(2023-12-25)。columnWidth=40px/日。
    // タスク1: x=280〜400 / 行y=20〜40、タスク2: x=440〜680(中央560) / 行y=40〜60
    const TASK2_LEFT_HALF = { clientX: 500, clientY: 50 };
    const TASK2_RIGHT_HALF = { clientX: 600, clientY: 50 };

    /** ホバーで接続ハンドルを出して mousedown する */
    function startConnectDrag(
      container: HTMLElement,
      taskId: string,
      side: "start" | "end",
    ) {
      const group = container.querySelector(`[data-task-id="${taskId}"]`)!;
      fireEvent.mouseEnter(group);
      const handle = group.querySelector(
        `.gantt-connect-handle[data-side="${side}"]`,
      );
      expect(handle).not.toBeNull();
      fireEvent.mouseDown(handle!);
    }

    it("右端ハンドル→相手バー左半分へドロップで FS 依存を作成", () => {
      const onDependencyCreate = jest.fn();
      const { container } = render(
        <GanttChart
          {...defaultProps}
          editMode
          onDependencyCreate={onDependencyCreate}
        />,
      );

      startConnectDrag(container, "1", "end");
      fireEvent.mouseMove(document, TASK2_LEFT_HALF);
      fireEvent.mouseUp(document);

      expect(onDependencyCreate).toHaveBeenCalledWith("2", "1", "FS", 0);
    });

    it("左端ハンドル→相手バー左半分へドロップで SS 依存を作成", () => {
      const onDependencyCreate = jest.fn();
      const { container } = render(
        <GanttChart
          {...defaultProps}
          editMode
          onDependencyCreate={onDependencyCreate}
        />,
      );

      startConnectDrag(container, "1", "start");
      fireEvent.mouseMove(document, TASK2_LEFT_HALF);
      fireEvent.mouseUp(document);

      expect(onDependencyCreate).toHaveBeenCalledWith("2", "1", "SS", 0);
    });

    it("右端ハンドル→相手バー右半分へドロップで FF 依存を作成", () => {
      const onDependencyCreate = jest.fn();
      const { container } = render(
        <GanttChart
          {...defaultProps}
          editMode
          onDependencyCreate={onDependencyCreate}
        />,
      );

      startConnectDrag(container, "1", "end");
      fireEvent.mouseMove(document, TASK2_RIGHT_HALF);
      fireEvent.mouseUp(document);

      expect(onDependencyCreate).toHaveBeenCalledWith("2", "1", "FF", 0);
    });

    it("ドラッグ中はプレビュー線とターゲット強調を表示し、確定後に消える", () => {
      const { container } = render(
        <GanttChart
          {...defaultProps}
          editMode
          onDependencyCreate={jest.fn()}
        />,
      );

      startConnectDrag(container, "1", "end");
      fireEvent.mouseMove(document, TASK2_LEFT_HALF);
      expect(
        container.querySelector('[data-testid="ganttv3-connect-line"]'),
      ).toBeInTheDocument();
      expect(
        container.querySelector('[data-testid="ganttv3-connect-target"]'),
      ).toBeInTheDocument();

      fireEvent.mouseUp(document);
      expect(
        container.querySelector('[data-testid="ganttv3-connect-line"]'),
      ).not.toBeInTheDocument();
    });

    it("バーの無い場所へドロップしても作成しない", () => {
      const onDependencyCreate = jest.fn();
      const { container } = render(
        <GanttChart
          {...defaultProps}
          editMode
          onDependencyCreate={onDependencyCreate}
        />,
      );

      startConnectDrag(container, "1", "end");
      // タスク2の行だがバー左端(440)より手前
      fireEvent.mouseMove(document, { clientX: 410, clientY: 50 });
      fireEvent.mouseUp(document);

      expect(onDependencyCreate).not.toHaveBeenCalled();
    });

    it("自分自身へドロップしても作成しない", () => {
      const onDependencyCreate = jest.fn();
      const { container } = render(
        <GanttChart
          {...defaultProps}
          editMode
          onDependencyCreate={onDependencyCreate}
        />,
      );

      startConnectDrag(container, "1", "end");
      fireEvent.mouseMove(document, { clientX: 300, clientY: 30 }); // タスク1自身
      fireEvent.mouseUp(document);

      expect(onDependencyCreate).not.toHaveBeenCalled();
    });

    it("既存と重複する依存は作成しない", () => {
      const onDependencyCreate = jest.fn();
      const tasksWithDep = [
        tasks[0],
        { ...tasks[1], predecessors: [{ taskId: "1", type: "FS" as const, lag: 0 }] },
      ];
      const { container } = render(
        <GanttChart
          {...defaultProps}
          tasks={tasksWithDep}
          editMode
          onDependencyCreate={onDependencyCreate}
        />,
      );

      startConnectDrag(container, "1", "end");
      fireEvent.mouseMove(document, TASK2_LEFT_HALF);
      fireEvent.mouseUp(document);

      expect(onDependencyCreate).not.toHaveBeenCalled();
    });

    it("循環になる依存は作成しない", () => {
      const onDependencyCreate = jest.fn();
      // タスク1が既にタスク2へ依存 → 2に1を先行として足すと循環
      const tasksWithDep = [
        { ...tasks[0], predecessors: [{ taskId: "2", type: "FS" as const, lag: 0 }] },
        tasks[1],
      ];
      const { container } = render(
        <GanttChart
          {...defaultProps}
          tasks={tasksWithDep}
          editMode
          onDependencyCreate={onDependencyCreate}
        />,
      );

      startConnectDrag(container, "1", "end");
      fireEvent.mouseMove(document, TASK2_LEFT_HALF);
      fireEvent.mouseUp(document);

      expect(onDependencyCreate).not.toHaveBeenCalled();
    });

    it("Escape キーでドラッグをキャンセルできる", () => {
      const onDependencyCreate = jest.fn();
      const { container } = render(
        <GanttChart
          {...defaultProps}
          editMode
          onDependencyCreate={onDependencyCreate}
        />,
      );

      startConnectDrag(container, "1", "end");
      fireEvent.mouseMove(document, TASK2_LEFT_HALF);
      fireEvent.keyDown(document, { key: "Escape" });
      expect(
        container.querySelector('[data-testid="ganttv3-connect-line"]'),
      ).not.toBeInTheDocument();

      fireEvent.mouseUp(document);
      expect(onDependencyCreate).not.toHaveBeenCalled();
    });

    it("非編集モードでは接続ハンドルを表示しない", () => {
      const { container } = render(
        <GanttChart
          {...defaultProps}
          editMode={false}
          onDependencyCreate={jest.fn()}
        />,
      );
      const group = container.querySelector('[data-task-id="1"]')!;
      fireEvent.mouseEnter(group);
      expect(container.querySelectorAll(".gantt-connect-handle")).toHaveLength(0);
    });
  });

  describe("依存矢印のクリック編集（編集モード）", () => {
    const tasksWithDep = [
      tasks[0],
      { ...tasks[1], predecessors: [{ taskId: "1", type: "FS" as const, lag: 0 }] },
    ];

    it("編集モードで矢印クリックすると onEditDependencies(後続タスクID) が発火", () => {
      const onEditDependencies = jest.fn();
      const { container } = render(
        <GanttChart
          {...defaultProps}
          tasks={tasksWithDep}
          style={makeStyle({ showDependencies: true, showTodayLine: false })}
          editMode
          onEditDependencies={onEditDependencies}
        />,
      );

      const hit = container.querySelector("[data-dep-arrow]");
      expect(hit).not.toBeNull();
      fireEvent.click(hit!);
      expect(onEditDependencies).toHaveBeenCalledWith("2");
    });

    it("非編集モードでは矢印のクリック領域を描画しない", () => {
      const { container } = render(
        <GanttChart
          {...defaultProps}
          tasks={tasksWithDep}
          style={makeStyle({ showDependencies: true, showTodayLine: false })}
          editMode={false}
          onEditDependencies={jest.fn()}
        />,
      );
      expect(container.querySelector("[data-dep-arrow]")).toBeNull();
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

    it("onDeleteTask未指定では削除ボタンを表示しない", () => {
      const { container } = render(<GanttChart {...defaultProps} editMode />);
      mouseDownOnBar(container, "1", 100);
      fireEvent.mouseUp(document);
      expect(screen.queryByText("削除")).not.toBeInTheDocument();
    });

    it("パネルの削除ボタンで onDeleteTask(taskId) が発火しパネルが閉じる", () => {
      const onDeleteTask = jest.fn();
      const { container } = render(
        <GanttChart {...defaultProps} editMode onDeleteTask={onDeleteTask} />,
      );

      mouseDownOnBar(container, "1", 100);
      fireEvent.mouseUp(document);
      expect(screen.getByText("削除")).toBeInTheDocument();

      fireEvent.click(screen.getByText("削除"));

      expect(onDeleteTask).toHaveBeenCalledWith("1");
      expect(screen.queryByText("予定開始日")).not.toBeInTheDocument();
    });
  });

  describe("色分けモード", () => {
    const coloredTask = [
      makeTask({
        id: "1",
        name: "タスクA",
        category: "設計",
        color: "#123456",
        startDate: new Date("2024-01-01T00:00:00.000Z"),
        endDate: new Date("2024-01-03T00:00:00.000Z"),
        actualStartDate: new Date("2024-01-02T00:00:00.000Z"),
        actualEndDate: new Date("2024-01-04T00:00:00.000Z"),
        forecastStartDate: new Date("2024-01-02T00:00:00.000Z"),
        forecastEndDate: new Date("2024-01-08T00:00:00.000Z"),
      }),
    ];

    it("phase モード（既定）ではフェーズ色（task.color）がそのまま使われる", () => {
      const { container } = render(
        <GanttChart
          {...defaultProps}
          tasks={coloredTask}
          style={makeStyle({
            showDependencies: false,
            showTodayLine: false,
            showActual: true,
            showForecast: true,
            colorMode: "phase",
          })}
        />,
      );
      const bar = container.querySelector('[data-task-id="1"] rect')!;
      expect(bar.getAttribute("fill")).toBe("#12345620");
      const actualRect = container.querySelector(
        '[data-testid="ganttv3-actual-bar"] rect',
      )!;
      expect(actualRect.getAttribute("fill")).toBe("#123456");
      const forecastRect = container.querySelector(
        '[data-testid="ganttv3-forecast-bar"] rect',
      )!;
      expect(forecastRect.getAttribute("fill")).toBe("#123456");
    });

    it("planActualForecast モードでは予定/実績/見通しごとに固定色になる", () => {
      const { container } = render(
        <GanttChart
          {...defaultProps}
          tasks={coloredTask}
          style={makeStyle({
            showDependencies: false,
            showTodayLine: false,
            showActual: true,
            showForecast: true,
            colorMode: "planActualForecast",
          })}
        />,
      );
      const bar = container.querySelector('[data-task-id="1"] rect')!;
      expect(bar.getAttribute("fill")).toBe("#3B82F620"); // 予定=固定の青
      const actualRect = container.querySelector(
        '[data-testid="ganttv3-actual-bar"] rect',
      )!;
      expect(actualRect.getAttribute("fill")).toBe("#10B981"); // 実績=固定の緑
      const forecastRect = container.querySelector(
        '[data-testid="ganttv3-forecast-bar"] rect',
      )!;
      expect(forecastRect.getAttribute("fill")).toBe("#F59E0B"); // 見通し=固定の橙
    });
  });

  describe("バー内ラベル（inside 配置）", () => {
    const insideStyle = makeStyle({
      showDependencies: false,
      showTodayLine: false,
      labelPosition: "inside",
      showProgress: true,
    });

    it("予定バー内にタスク名と工数を表示する", () => {
      render(<GanttChart {...defaultProps} style={insideStyle} />);
      // makeTask 既定の duration=2
      expect(screen.getByText("タスクA (2h)")).toBeInTheDocument();
      expect(screen.getByText("タスクB (2h)")).toBeInTheDocument();
    });

    it("実績・見通しバーにもタスク名ラベルを描画する", () => {
      const withActual = [
        makeTask({
          id: "1",
          name: "タスクA",
          category: "設計",
          startDate: new Date("2024-01-01T00:00:00.000Z"),
          endDate: new Date("2024-01-03T00:00:00.000Z"),
          actualStartDate: new Date("2024-01-02T00:00:00.000Z"),
          actualEndDate: new Date("2024-01-04T00:00:00.000Z"),
          forecastStartDate: new Date("2024-01-02T00:00:00.000Z"),
          forecastEndDate: new Date("2024-01-08T00:00:00.000Z"),
        }),
      ];
      render(
        <GanttChart
          {...defaultProps}
          tasks={withActual}
          style={makeStyle({
            showDependencies: false,
            showTodayLine: false,
            labelPosition: "inside",
            showActual: true,
            showForecast: true,
          })}
        />,
      );
      // タスクリスト行(1) + 予定/実績/見通しの3バー = 計4箇所
      expect(screen.getAllByText(/タスクA/).length).toBeGreaterThanOrEqual(4);
      // 予定/実績/見通しの3バーとも「名前 + 工数」を表示（duration=2）
      expect(screen.getAllByText("タスクA (2h)").length).toBe(3);
    });
  });

  describe("バーのクリックで詳細（非編集モード）", () => {
    it("バーのクリックで onTaskSelect(taskId) が発火する", () => {
      const onTaskSelect = jest.fn();
      const { container } = render(
        <GanttChart {...defaultProps} onTaskSelect={onTaskSelect} />,
      );
      fireEvent.click(container.querySelector('[data-task-id="1"] rect')!);
      expect(onTaskSelect).toHaveBeenCalledWith("1");
    });

    it("編集モードではバークリックで onTaskSelect を発火しない", () => {
      const onTaskSelect = jest.fn();
      const { container } = render(
        <GanttChart
          {...defaultProps}
          editMode
          onTaskSelect={onTaskSelect}
        />,
      );
      mouseDownOnBar(container, "1", 100);
      fireEvent.mouseUp(document);
      expect(onTaskSelect).not.toHaveBeenCalled();
    });
  });

  describe("ホバーでツールチップ", () => {
    it("バーのホバーでツールチップを表示し、離脱で消える", () => {
      const { container } = render(<GanttChart {...defaultProps} />);
      expect(
        screen.queryByTestId("ganttv3-task-tooltip"),
      ).not.toBeInTheDocument();

      const bar = container.querySelector('[data-task-id="1"]')!;
      fireEvent.mouseEnter(bar);
      const tip = screen.getByTestId("ganttv3-task-tooltip");
      expect(within(tip).getByText(/タスクA/)).toBeInTheDocument();

      fireEvent.mouseLeave(bar);
      expect(
        screen.queryByTestId("ganttv3-task-tooltip"),
      ).not.toBeInTheDocument();
    });

    it("ドラッグ後にツールチップが古い位置で再表示されない（編集モード）", () => {
      const { container } = render(<GanttChart {...defaultProps} editMode />);
      const bar = container.querySelector('[data-task-id="1"]')!;
      // ホバーでツールチップ表示 → そのままドラッグ（mouseleave は発火しない）
      fireEvent.mouseEnter(bar);
      expect(screen.getByTestId("ganttv3-task-tooltip")).toBeInTheDocument();

      mouseDownOnBar(container, "1", 100);
      fireEvent.mouseMove(document, { clientX: 100 + PX_PER_DAY * 2 });
      fireEvent.mouseUp(document);

      // ドラッグ確定後に古い座標のツールチップが残らない
      expect(
        screen.queryByTestId("ganttv3-task-tooltip"),
      ).not.toBeInTheDocument();
    });
  });

  describe("日付ヘッダーでのホイールズーム", () => {
    it("ホイール（上方向）で onZoomChange が拡大方向に発火する", () => {
      const onZoomChange = jest.fn();
      const { container } = render(
        <GanttChart
          {...defaultProps}
          zoomLevel={1.0}
          onZoomChange={onZoomChange}
        />,
      );
      const header = container.querySelector(
        '[data-testid="ganttv3-timeline-header"]',
      )!;
      fireEvent.wheel(header, { deltaY: -100 });
      expect(onZoomChange).toHaveBeenCalledTimes(1);
      expect(onZoomChange.mock.calls[0][0]).toBeGreaterThan(1.0);
    });

    it("ホイール（下方向）で onZoomChange が縮小方向に発火する", () => {
      const onZoomChange = jest.fn();
      const { container } = render(
        <GanttChart
          {...defaultProps}
          zoomLevel={1.0}
          onZoomChange={onZoomChange}
        />,
      );
      const header = container.querySelector(
        '[data-testid="ganttv3-timeline-header"]',
      )!;
      fireEvent.wheel(header, { deltaY: 100 });
      expect(onZoomChange.mock.calls[0][0]).toBeLessThan(1.0);
    });

    it("Ctrl+ホイールは横ズーム（onZoomChange）を発火しない", () => {
      const onZoomChange = jest.fn();
      const { container } = render(
        <GanttChart
          {...defaultProps}
          zoomLevel={1.0}
          onZoomChange={onZoomChange}
        />,
      );
      const header = container.querySelector(
        '[data-testid="ganttv3-timeline-header"]',
      )!;
      fireEvent.wheel(header, { deltaY: -100, ctrlKey: true });
      expect(onZoomChange).not.toHaveBeenCalled();
    });
  });
});
