import { renderHook, act } from "@testing-library/react";
import { useGanttMutations } from "@/components/ganttv3/hooks/useGanttMutations";
import type { Task, GanttPhase } from "@/components/ganttv3/gantt";
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

const mockCreateTask = createTask as jest.Mock;
const mockUpdateTask = updateTask as jest.Mock;
const mockDeleteTask = deleteTask as jest.Mock;
const mockUpdateMilestone = updateMilestone as jest.Mock;
const mockDeleteMilestone = deleteMilestone as jest.Mock;
const mockCreateDep = createGanttDependency as jest.Mock;
const mockDeleteDep = deleteGanttDependency as jest.Mock;

function setup(tasks: Task[], categories: GanttPhase[] = []) {
  const setTasks = jest.fn();
  const refetchTasks = jest.fn().mockResolvedValue(undefined);
  const onAfterDelete = jest.fn();
  const { result } = renderHook(() =>
    useGanttMutations({
      wbsId: 1,
      tasks,
      setTasks,
      categories,
      refetchTasks,
      onAfterDelete,
    }),
  );
  return { result, setTasks, refetchTasks, onAfterDelete };
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

describe("useGanttMutations", () => {
  describe("handleTaskUpdate", () => {
    it("成功時: 楽観的更新→updateTask呼び出し（ロールバックなし）", async () => {
      const task = makeTask({ id: "1", dbId: 10 });
      const { result, setTasks } = setup([task]);

      await act(async () => {
        await result.current.handleTaskUpdate({ ...task, name: "改名" });
      });

      expect(mockUpdateTask).toHaveBeenCalledTimes(1);
      expect(mockUpdateTask.mock.calls[0][0]).toBe(1); // wbsId
      expect(mockUpdateTask.mock.calls[0][1]).toMatchObject({ id: 10, name: "改名" });
      // 楽観的更新の1回のみ（ロールバックなし）
      expect(setTasks).toHaveBeenCalledTimes(1);
    });

    it("マイルストーンは updateMilestone を呼ぶ", async () => {
      const ms = makeTask({ id: "1", dbId: 5, isMilestone: true });
      const { result } = setup([ms]);
      await act(async () => {
        await result.current.handleTaskUpdate(ms);
      });
      expect(mockUpdateMilestone).toHaveBeenCalledTimes(1);
      expect(mockUpdateTask).not.toHaveBeenCalled();
    });

    it("失敗時: ロールバックで setTasks が2回呼ばれる", async () => {
      mockUpdateTask.mockResolvedValue({ success: false, error: "NG" });
      const task = makeTask({ id: "1", dbId: 10 });
      const { result, setTasks } = setup([task]);

      await act(async () => {
        await result.current.handleTaskUpdate({ ...task, name: "x" });
      });
      // 楽観的更新 + ロールバック
      expect(setTasks).toHaveBeenCalledTimes(2);
    });
  });

  describe("handleTaskDelete", () => {
    it("楽観的削除→onAfterDelete→サーバー削除（種別ごと）", async () => {
      const t = makeTask({ id: "1", dbId: 10 });
      const ms = makeTask({ id: "2", dbId: 20, isMilestone: true });
      const { result, setTasks, onAfterDelete } = setup([t, ms]);

      await act(async () => {
        await result.current.handleTaskDelete(["1", "2"]);
      });

      expect(setTasks).toHaveBeenCalledTimes(1); // 楽観的削除
      expect(onAfterDelete).toHaveBeenCalledTimes(1);
      expect(mockDeleteTask).toHaveBeenCalledWith(10);
      expect(mockDeleteMilestone).toHaveBeenCalledWith(20, 1);
    });
  });

  describe("handleDependencyRemove", () => {
    it("成功時: 楽観的更新のみ・deleteGanttDependency 呼び出し", async () => {
      const t = makeTask({ id: "1", predecessors: [makeDependency("0", { dbId: 99 })] });
      const { result, setTasks } = setup([t]);
      await act(async () => {
        await result.current.handleDependencyRemove(99);
      });
      expect(mockDeleteDep).toHaveBeenCalledWith(1, 99);
      expect(setTasks).toHaveBeenCalledTimes(1);
    });

    it("失敗時: ロールバックで setTasks が2回", async () => {
      mockDeleteDep.mockResolvedValue({ success: false, error: "NG" });
      const t = makeTask({ id: "1", predecessors: [makeDependency("0", { dbId: 99 })] });
      const { result, setTasks } = setup([t]);
      await act(async () => {
        await result.current.handleDependencyRemove(99);
      });
      expect(setTasks).toHaveBeenCalledTimes(2);
    });
  });

  describe("handleDependencyUpdate", () => {
    it("旧依存を削除→新依存を作成→refetch", async () => {
      const { result, refetchTasks } = setup([makeTask({ id: "1" })]);
      await act(async () => {
        await result.current.handleDependencyUpdate(99, "2", "1", "FS", 0);
      });
      expect(mockDeleteDep).toHaveBeenCalledWith(1, 99);
      expect(mockCreateDep).toHaveBeenCalledTimes(1);
      expect(refetchTasks).toHaveBeenCalledTimes(1);
    });
  });
});
