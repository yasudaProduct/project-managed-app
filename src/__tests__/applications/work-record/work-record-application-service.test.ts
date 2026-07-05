import { WorkRecordApplicationService } from "@/applications/work-record/work-record-application-service";
import type { IWorkRecordRepository } from "@/applications/work-record/repositories/iwork-record-repository";

describe("WorkRecordApplicationService", () => {
  let workRecordRepository: jest.Mocked<IWorkRecordRepository>;
  let service: WorkRecordApplicationService;

  beforeEach(() => {
    workRecordRepository = {
      findAll: jest.fn(),
      bulkCreate: jest.fn(),
      bulkUpsert: jest.fn(),
      deleteByUserAndDateRange: jest.fn(),
    };

    service = new WorkRecordApplicationService(workRecordRepository);
  });

  describe("getWorkRecords", () => {
    it("ユーザー名・タスク情報を含む作業実績一覧を返すこと", async () => {
      workRecordRepository.findAll.mockResolvedValue([
        {
          id: 1,
          userId: "u1",
          userName: "山田太郎",
          taskId: 10,
          taskNo: "T-1",
          taskName: "設計",
          date: new Date("2026-01-01"),
          hoursWorked: 8,
        },
      ]);

      const result = await service.getWorkRecords();

      expect(result).toEqual([
        {
          id: 1,
          userId: "u1",
          userName: "山田太郎",
          taskId: 10,
          taskNo: "T-1",
          taskName: "設計",
          date: new Date("2026-01-01"),
          hoursWorked: 8,
        },
      ]);
    });
  });
});
