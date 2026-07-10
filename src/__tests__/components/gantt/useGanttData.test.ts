import { renderHook, waitFor, act } from "@testing-library/react";
import { useGanttData } from "@/components/gantt/hooks/useGanttData";
import { makeTask, makePhase } from "./_fixtures";

jest.mock("@/app/wbs/[id]/gantt/actions", () => ({
  getGanttTasks: jest.fn(),
  getPhases: jest.fn(),
  getAssigneeOptions: jest.fn(),
}));

import {
  getGanttTasks,
  getPhases,
  getAssigneeOptions,
} from "@/app/wbs/[id]/gantt/actions";

const mockGetGanttTasks = getGanttTasks as jest.Mock;
const mockGetPhases = getPhases as jest.Mock;
const mockGetAssigneeOptions = getAssigneeOptions as jest.Mock;

describe("useGanttData", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetGanttTasks.mockResolvedValue([]);
    mockGetPhases.mockResolvedValue([]);
    mockGetAssigneeOptions.mockResolvedValue([]);
  });

  it("マウント時に tasks/phases/assignees を wbsId 指定で取得する", async () => {
    const tasks = [makeTask({ id: "1" }), makeTask({ id: "2" })];
    const phases = [makePhase({ id: "p1", name: "設計" })];
    const assignees = [{ id: 1, name: "山田" }];
    mockGetGanttTasks.mockResolvedValue(tasks);
    mockGetPhases.mockResolvedValue(phases);
    mockGetAssigneeOptions.mockResolvedValue(assignees);

    const { result } = renderHook(() => useGanttData(123));

    await waitFor(() => expect(result.current.tasks).toHaveLength(2));
    expect(mockGetGanttTasks).toHaveBeenCalledWith(123);
    expect(mockGetPhases).toHaveBeenCalledWith(123);
    expect(mockGetAssigneeOptions).toHaveBeenCalledWith(123);
    expect(result.current.categories).toEqual(phases);
    expect(result.current.assignees).toEqual(assignees);
  });

  it("取得した tasks にクリティカルパスが付与される", async () => {
    mockGetGanttTasks.mockResolvedValue([makeTask({ id: "1" })]);
    const { result } = renderHook(() => useGanttData(1));
    await waitFor(() => expect(result.current.tasks).toHaveLength(1));
    // 単一タスクはクリティカルパス上
    expect(result.current.tasks[0].isOnCriticalPath).toBe(true);
  });

  it("refetchTasks で再取得して反映する", async () => {
    const { result } = renderHook(() => useGanttData(7));
    await waitFor(() => expect(mockGetGanttTasks).toHaveBeenCalled());

    mockGetGanttTasks.mockResolvedValue([makeTask({ id: "x" })]);
    await act(async () => {
      await result.current.refetchTasks();
    });
    expect(result.current.tasks).toHaveLength(1);
    expect(result.current.tasks[0].id).toBe("x");
  });

  it("setTasks で直接更新できる（楽観的更新用）", async () => {
    const { result } = renderHook(() => useGanttData(1));
    await waitFor(() => expect(mockGetGanttTasks).toHaveBeenCalled());
    act(() => {
      result.current.setTasks([makeTask({ id: "opt" })]);
    });
    expect(result.current.tasks[0].id).toBe("opt");
  });
});
