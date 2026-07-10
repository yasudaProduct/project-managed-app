import { GetWbsTaskSummaryHandler } from "@/applications/wbs/query/get-wbs-task-summary-handler";
import { GetWbsTaskSummaryQuery } from "@/applications/wbs/query/get-wbs-task-summary-query";
import type { IWbsQueryRepository, WbsTaskData } from "@/applications/wbs/query/iwbs-query-repository";

describe("GetWbsTaskSummaryHandler", () => {
  let handler: GetWbsTaskSummaryHandler;
  let mockWbsQueryRepository: jest.Mocked<IWbsQueryRepository>;

  const baseTask: WbsTaskData = {
    id: "1",
    no: "T-1",
    name: "タスク1",
    kijunKosu: 10,
    yoteiKosu: 20,
    jissekiKosu: 15,
    kijunStart: null,
    kijunEnd: null,
    yoteiStart: null,
    yoteiEnd: null,
    jissekiStart: null,
    jissekiEnd: null,
    progressRate: null,
    status: "NOT_STARTED",
    phase: null,
    assignee: null,
  };

  beforeEach(() => {
    mockWbsQueryRepository = {
      getWbsTasks: jest.fn(),
      getPhases: jest.fn(),
      getTaskActualHoursByMonth: jest.fn(),
      getUnlinkedWorkRecordsCount: jest.fn(),
    };

    handler = new GetWbsTaskSummaryHandler(mockWbsQueryRepository);
  });

  it("工数の合計と未紐付け作業実績件数を返すこと", async () => {
    mockWbsQueryRepository.getWbsTasks.mockResolvedValue([
      { ...baseTask, id: "1", kijunKosu: 10, yoteiKosu: 20, jissekiKosu: 15, status: "COMPLETED" },
      { ...baseTask, id: "2", kijunKosu: 5, yoteiKosu: 10, jissekiKosu: 8, status: "IN_PROGRESS" },
    ]);
    mockWbsQueryRepository.getUnlinkedWorkRecordsCount.mockResolvedValue(3);

    const result = await handler.execute(new GetWbsTaskSummaryQuery(1));

    expect(mockWbsQueryRepository.getWbsTasks).toHaveBeenCalledWith(1);
    expect(mockWbsQueryRepository.getUnlinkedWorkRecordsCount).toHaveBeenCalledWith(1);
    expect(result.kijunKosu).toBe(15);
    expect(result.taskKosu).toBe(30);
    expect(result.taskJisseki).toBe(23);
    expect(result.unlinkedWorkRecordsCount).toBe(3);
    expect(result.actualCompleted).toBe(1);
    expect(result.actualInProgress).toBe(1);
  });

  it("進捗率0で全タスク未着手の場合、進捗率0を返す", async () => {
    mockWbsQueryRepository.getWbsTasks.mockResolvedValue([
      { ...baseTask, id: "1", status: "NOT_STARTED" },
    ]);
    mockWbsQueryRepository.getUnlinkedWorkRecordsCount.mockResolvedValue(0);

    const result = await handler.execute(new GetWbsTaskSummaryQuery(1));

    expect(result.actualProgress).toBe(0);
    expect(result.plannedProgress).toBe(0);
  });

  it("予定終了日が過去のタスクを予定完了として計上すること", async () => {
    const past = new Date();
    past.setFullYear(past.getFullYear() - 1);
    const pastEnd = new Date(past);
    pastEnd.setDate(pastEnd.getDate() + 5);

    mockWbsQueryRepository.getWbsTasks.mockResolvedValue([
      {
        ...baseTask,
        id: "1",
        status: "COMPLETED",
        yoteiStart: past,
        yoteiEnd: pastEnd,
        yoteiKosu: 40,
      },
    ]);
    mockWbsQueryRepository.getUnlinkedWorkRecordsCount.mockResolvedValue(0);

    const result = await handler.execute(new GetWbsTaskSummaryQuery(1));

    expect(result.plannedCompleted).toBe(1);
    expect(result.plannedCompletedKosu).toBe(40);
    expect(result.plannedProgress).toBe(100);
  });

  it("ON_HOLDのタスクは予定集計から除外されること", async () => {
    const past = new Date();
    past.setFullYear(past.getFullYear() - 1);

    mockWbsQueryRepository.getWbsTasks.mockResolvedValue([
      { ...baseTask, id: "1", status: "ON_HOLD", yoteiStart: past, yoteiEnd: past, yoteiKosu: 10 },
    ]);
    mockWbsQueryRepository.getUnlinkedWorkRecordsCount.mockResolvedValue(0);

    const result = await handler.execute(new GetWbsTaskSummaryQuery(1));

    expect(result.plannedCompleted).toBe(0);
    expect(result.plannedInProgress).toBe(0);
    expect(result.plannedCompletedKosu).toBe(0);
  });
});
