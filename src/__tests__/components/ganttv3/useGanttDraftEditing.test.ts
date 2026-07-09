import { renderHook, act } from "@testing-library/react";
import { useGanttDraftEditing } from "@/components/ganttv3/hooks/useGanttDraftEditing";
import type { Task } from "@/components/ganttv3/gantt";
import { makeTask, makeDependency } from "./_fixtures";

jest.mock("@/app/wbs/[id]/actions/wbs-task-actions", () => ({
  createTask: jest.fn(),
  updateTask: jest.fn(),
  deleteTask: jest.fn(),
}));
jest.mock("@/app/wbs/[id]/actions/milestone-actions", () => ({
  updateMilestone: jest.fn(),
  deleteMilestone: jest.fn(),
}));
jest.mock("@/app/wbs/[id]/ganttv3/dependency-actions", () => ({
  createGanttDependency: jest.fn(),
  deleteGanttDependency: jest.fn(),
}));
jest.mock("@/hooks/use-toast", () => ({ toast: jest.fn() }));

import {
  createTask,
  updateTask,
  deleteTask,
} from "@/app/wbs/[id]/actions/wbs-task-actions";
import {
  updateMilestone,
  deleteMilestone,
} from "@/app/wbs/[id]/actions/milestone-actions";
import {
  createGanttDependency,
  deleteGanttDependency,
} from "@/app/wbs/[id]/ganttv3/dependency-actions";
import { toast } from "@/hooks/use-toast";

const mockCreateTask = createTask as jest.Mock;
const mockUpdateTask = updateTask as jest.Mock;
const mockDeleteTask = deleteTask as jest.Mock;
const mockUpdateMilestone = updateMilestone as jest.Mock;
const mockDeleteMilestone = deleteMilestone as jest.Mock;
const mockCreateDep = createGanttDependency as jest.Mock;
const mockDeleteDep = deleteGanttDependency as jest.Mock;
const mockToast = toast as jest.Mock;

function setup(tasks: Task[]) {
  const refetchTasks = jest.fn().mockResolvedValue(undefined);
  const onExitEditMode = jest.fn();
  const { result } = renderHook(() =>
    useGanttDraftEditing({ tasks, wbsId: 1, refetchTasks, onExitEditMode }),
  );
  return { result, refetchTasks, onExitEditMode };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockCreateTask.mockResolvedValue({ success: true });
  mockUpdateTask.mockResolvedValue({ success: true });
  mockDeleteTask.mockResolvedValue({ success: true });
  mockUpdateMilestone.mockResolvedValue({ success: true });
  mockDeleteMilestone.mockResolvedValue({ success: true });
  mockCreateDep.mockResolvedValue({ success: true });
  mockDeleteDep.mockResolvedValue({ success: true });
});

describe("useGanttDraftEditing", () => {
  it("初期状態: editMode false / chartTasks は元 tasks", () => {
    const tasks = [makeTask({ id: "1" })];
    const { result } = setup(tasks);
    expect(result.current.editMode).toBe(false);
    expect(result.current.chartTasks).toBe(tasks);
  });

  it("編集モードに入ると chartTasks はドラフト（元 tasks のクローン）", () => {
    const tasks = [makeTask({ id: "1" })];
    const { result } = setup(tasks);
    act(() => result.current.handleEnterEditMode());
    expect(result.current.editMode).toBe(true);
    expect(result.current.chartTasks).not.toBe(tasks);
    expect(result.current.chartTasks.map((t) => t.id)).toEqual(["1"]);
  });

  it("キャンセルで編集モードを抜け onExitEditMode を呼ぶ", () => {
    const { result, onExitEditMode } = setup([makeTask({ id: "1" })]);
    act(() => result.current.handleEnterEditMode());
    act(() => result.current.handleCancelEdit());
    expect(result.current.editMode).toBe(false);
    expect(onExitEditMode).toHaveBeenCalledTimes(1);
  });

  it("ドラフトのタスク更新は元 tasks を破壊しない", () => {
    const tasks = [makeTask({ id: "1", name: "orig" })];
    const { result } = setup(tasks);
    act(() => result.current.handleEnterEditMode());
    act(() =>
      result.current.handleDraftTaskUpdate({ ...tasks[0], name: "edited" }),
    );
    expect(result.current.chartTasks[0].name).toBe("edited");
    expect(tasks[0].name).toBe("orig");
  });

  it("ドラフトへの依存追加は一時(負値)dbIdを付与する", () => {
    const tasks = [makeTask({ id: "1" }), makeTask({ id: "2" })];
    const { result } = setup(tasks);
    act(() => result.current.handleEnterEditMode());
    act(() => result.current.handleDraftDependencyAdd("2", "1", "FS", 0));
    const t2 = result.current.chartTasks.find((t) => t.id === "2")!;
    expect(t2.predecessors).toHaveLength(1);
    expect(t2.predecessors[0].taskId).toBe("1");
    expect(t2.predecessors[0].dbId!).toBeLessThan(0);
  });

  it("ドラフトの依存削除", () => {
    const tasks = [
      makeTask({ id: "1", predecessors: [makeDependency("0", { dbId: 5 })] }),
    ];
    const { result } = setup(tasks);
    act(() => result.current.handleEnterEditMode());
    act(() => result.current.handleDraftDependencyRemove(5));
    expect(result.current.chartTasks[0].predecessors).toHaveLength(0);
  });

  it("保存: 変更されたタスクは updateTask、依存差分も反映し refetch/onExit", async () => {
    const tasks = [
      makeTask({ id: "1", dbId: 10, duration: 2 }),
      makeTask({ id: "2", dbId: 20 }),
    ];
    const { result, refetchTasks, onExitEditMode } = setup(tasks);
    act(() => result.current.handleEnterEditMode());
    act(() =>
      result.current.handleDraftTaskUpdate({ ...tasks[0], duration: 5 }),
    );
    act(() => result.current.handleDraftDependencyAdd("2", "1", "FS", 0));

    await act(async () => {
      await result.current.handleSaveEdit();
    });

    expect(mockUpdateTask).toHaveBeenCalledTimes(1);
    expect(mockUpdateTask.mock.calls[0][1]).toMatchObject({
      id: 10,
      yoteiKosu: 5,
    });
    expect(mockCreateDep).toHaveBeenCalledTimes(1);
    expect(mockCreateDep.mock.calls[0][1]).toMatchObject({
      successorTaskId: 2,
      predecessorTaskId: 1,
      type: "FS",
      lag: 0,
    });
    expect(refetchTasks).toHaveBeenCalledTimes(1);
    expect(onExitEditMode).toHaveBeenCalledTimes(1);
    expect(result.current.editMode).toBe(false);
  });

  it("保存: 進捗率のみの変更でも updateTask が呼ばれ progressRate が送られる", async () => {
    const tasks = [makeTask({ id: "1", dbId: 10, progressRate: 20 })];
    const { result } = setup(tasks);
    act(() => result.current.handleEnterEditMode());
    act(() =>
      result.current.handleDraftTaskUpdate({ ...tasks[0], progressRate: 80 }),
    );

    await act(async () => {
      await result.current.handleSaveEdit();
    });

    expect(mockUpdateTask).toHaveBeenCalledTimes(1);
    expect(mockUpdateTask.mock.calls[0][1]).toMatchObject({
      id: 10,
      progressRate: 80,
    });
  });

  it("変更が無ければサーバー更新は呼ばれない", async () => {
    const tasks = [makeTask({ id: "1", dbId: 10 })];
    const { result } = setup(tasks);
    act(() => result.current.handleEnterEditMode());
    await act(async () => {
      await result.current.handleSaveEdit();
    });
    expect(mockUpdateTask).not.toHaveBeenCalled();
    expect(mockCreateDep).not.toHaveBeenCalled();
    expect(mockDeleteDep).not.toHaveBeenCalled();
  });

  it("編集モードでない場合の保存は即終了する", async () => {
    const { result } = setup([makeTask({ id: "1" })]);
    await act(async () => {
      await result.current.handleSaveEdit();
    });
    expect(result.current.editMode).toBe(false);
    expect(mockUpdateTask).not.toHaveBeenCalled();
  });

  describe("handleDraftTaskAdd / handleDraftTaskDelete", () => {
    it("ドラフトへタスクを追加すると chartTasks に反映される（dbId未設定）", () => {
      const { result } = setup([makeTask({ id: "1", dbId: 10 })]);
      act(() => result.current.handleEnterEditMode());
      act(() =>
        result.current.handleDraftTaskAdd(
          makeTask({ id: "ignored", name: "新規タスク", phaseId: 5 }),
        ),
      );
      expect(result.current.chartTasks).toHaveLength(2);
      const added = result.current.chartTasks.find((t) => t.name === "新規タスク")!;
      expect(added.dbId).toBeUndefined();
      expect(added.id).not.toBe("ignored");
    });

    it("ドラフトからタスクを削除すると chartTasks から消え、他タスクの依存参照も除去される", () => {
      const tasks = [
        makeTask({ id: "1", dbId: 10 }),
        makeTask({
          id: "2",
          dbId: 20,
          predecessors: [makeDependency("1", { dbId: 5 })],
        }),
      ];
      const { result } = setup(tasks);
      act(() => result.current.handleEnterEditMode());
      act(() => result.current.handleDraftTaskDelete(["1"]));
      expect(result.current.chartTasks).toHaveLength(1);
      expect(result.current.chartTasks[0].predecessors).toHaveLength(0);
    });

    it("保存: 新規追加タスクは createTask で作成される", async () => {
      const { result, refetchTasks } = setup([makeTask({ id: "1", dbId: 10 })]);
      act(() => result.current.handleEnterEditMode());
      act(() =>
        result.current.handleDraftTaskAdd(
          makeTask({
            id: "ignored",
            name: "新規タスク",
            phaseId: 5,
            duration: 8,
            assigneeId: 2,
          }),
        ),
      );

      await act(async () => {
        await result.current.handleSaveEdit();
      });

      expect(mockCreateTask).toHaveBeenCalledTimes(1);
      expect(mockCreateTask.mock.calls[0][0]).toBe(1); // wbsId
      expect(mockCreateTask.mock.calls[0][1]).toMatchObject({
        name: "新規タスク",
        phaseId: 5,
        assigneeId: "2",
      });
      // 既存タスクに変更が無ければ updateTask は呼ばれない
      expect(mockUpdateTask).not.toHaveBeenCalled();
      expect(refetchTasks).toHaveBeenCalledTimes(1);
      expect(result.current.editMode).toBe(false);
    });

    it("保存: 削除されたタスクは種別ごとに削除APIが呼ばれる", async () => {
      const tasks = [
        makeTask({ id: "1", dbId: 10 }),
        makeTask({ id: "2", dbId: 20, isMilestone: true }),
      ];
      const { result, refetchTasks } = setup(tasks);
      act(() => result.current.handleEnterEditMode());
      act(() => result.current.handleDraftTaskDelete(["1", "2"]));

      await act(async () => {
        await result.current.handleSaveEdit();
      });

      expect(mockDeleteTask).toHaveBeenCalledWith(10);
      expect(mockDeleteMilestone).toHaveBeenCalledWith(20, 1);
      expect(refetchTasks).toHaveBeenCalledTimes(1);
    });

    it("保存: 削除したタスクへの依存は明示的な削除APIを再度呼ばない（カスケード済み）", async () => {
      const tasks = [
        makeTask({ id: "1", dbId: 10 }),
        makeTask({
          id: "2",
          dbId: 20,
          predecessors: [makeDependency("1", { dbId: 5 })],
        }),
      ];
      const { result } = setup(tasks);
      act(() => result.current.handleEnterEditMode());
      act(() => result.current.handleDraftTaskDelete(["1"]));

      await act(async () => {
        await result.current.handleSaveEdit();
      });

      expect(mockDeleteTask).toHaveBeenCalledWith(10);
      // タスク削除のカスケードで依存も消えるため、依存削除APIは別途呼ばれない
      expect(mockDeleteDep).not.toHaveBeenCalled();
    });

    it("保存: 新規タスクへの依存関係は作成されず警告トーストが出る", async () => {
      const { result } = setup([makeTask({ id: "1", dbId: 10 })]);
      act(() => result.current.handleEnterEditMode());
      act(() =>
        result.current.handleDraftTaskAdd(
          makeTask({ id: "ignored", name: "新規タスク", phaseId: 5 }),
        ),
      );
      const newTaskId = result.current.chartTasks.find(
        (t) => t.name === "新規タスク",
      )!.id;
      act(() =>
        result.current.handleDraftDependencyAdd(newTaskId, "1", "FS", 0),
      );

      await act(async () => {
        await result.current.handleSaveEdit();
      });

      expect(mockCreateDep).not.toHaveBeenCalled();
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({ title: "一部の依存関係は保存されませんでした" }),
      );
    });
  });
});
