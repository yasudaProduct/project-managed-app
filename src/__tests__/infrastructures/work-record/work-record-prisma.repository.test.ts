import { WorkRecordRepository } from "@/infrastructures/work-record/work-record-repository";
import prisma from "@/lib/prisma/prisma";

jest.mock("@/lib/prisma/prisma", () => ({
  __esModule: true,
  default: {
    workRecord: {
      findMany: jest.fn(),
      createMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      create: jest.fn(),
      deleteMany: jest.fn(),
      groupBy: jest.fn(),
    },
  },
}));

describe("WorkRecordRepository", () => {
  let repository: WorkRecordRepository;
  const prismaMock = prisma as jest.Mocked<typeof prisma>;

  beforeEach(() => {
    repository = new WorkRecordRepository();
    jest.clearAllMocks();
  });

  describe("findAll", () => {
    it("ユーザー名・タスク情報を含む作業実績一覧を返すこと", async () => {
      (prismaMock.workRecord.findMany as jest.Mock).mockResolvedValue([
        {
          id: 1,
          userId: "u1",
          taskId: 10,
          date: new Date("2026-01-01"),
          hours_worked: 8,
          user: { id: "u1", name: "山田太郎" },
          task: { id: 10, name: "設計", taskNo: "T-1" },
        },
        {
          id: 2,
          userId: "u2",
          taskId: null,
          date: new Date("2026-01-02"),
          hours_worked: 4,
          user: { id: "u2", name: "鈴木花子" },
          task: null,
        },
      ]);

      const result = await repository.findAll();

      expect(prismaMock.workRecord.findMany).toHaveBeenCalledWith({
        include: {
          user: { select: { id: true, name: true } },
          task: { select: { id: true, name: true, taskNo: true } },
        },
      });
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
        {
          id: 2,
          userId: "u2",
          userName: "鈴木花子",
          taskId: null,
          taskNo: null,
          taskName: null,
          date: new Date("2026-01-02"),
          hoursWorked: 4,
        },
      ]);
    });
  });

  describe("findDailyHoursByUsers", () => {
    it("ユーザー・日付ごとの実績時間の合計を返すこと（全WBS横断）", async () => {
      (prismaMock.workRecord.groupBy as jest.Mock).mockResolvedValue([
        { userId: "u1", date: new Date("2026-10-28T00:00:00.000Z"), _sum: { hours_worked: 7.5 } },
        { userId: "u2", date: new Date("2026-10-29T00:00:00.000Z"), _sum: { hours_worked: null } },
      ]);

      const result = await repository.findDailyHoursByUsers(
        ["u1", "u2"],
        new Date("2026-10-27T00:00:00.000Z"),
        new Date("2026-10-30T00:00:00.000Z")
      );

      expect(prismaMock.workRecord.groupBy).toHaveBeenCalledWith({
        by: ["userId", "date"],
        where: {
          userId: { in: ["u1", "u2"] },
          date: {
            gte: new Date("2026-10-27T00:00:00.000Z"),
            lte: new Date("2026-10-30T00:00:00.000Z"),
          },
        },
        _sum: { hours_worked: true },
      });
      expect(result).toEqual([
        { userId: "u1", date: new Date("2026-10-28T00:00:00.000Z"), hours: 7.5 },
        { userId: "u2", date: new Date("2026-10-29T00:00:00.000Z"), hours: 0 },
      ]);
    });

    it("ユーザーが空なら問い合わせずに空配列を返すこと", async () => {
      const result = await repository.findDailyHoursByUsers(
        [],
        new Date("2026-10-27T00:00:00.000Z"),
        new Date("2026-10-30T00:00:00.000Z")
      );

      expect(result).toEqual([]);
      expect(prismaMock.workRecord.groupBy).not.toHaveBeenCalled();
    });
  });

  describe("findLastRecordDateByUsers", () => {
    it("指定日以前で実績のある最終日をユーザーごとに返すこと", async () => {
      (prismaMock.workRecord.groupBy as jest.Mock).mockResolvedValue([
        { userId: "u1", _max: { date: new Date("2026-10-30T00:00:00.000Z") } },
      ]);

      const result = await repository.findLastRecordDateByUsers(
        ["u1", "u2"],
        new Date("2026-10-31T00:00:00.000Z")
      );

      expect(prismaMock.workRecord.groupBy).toHaveBeenCalledWith({
        by: ["userId"],
        where: {
          userId: { in: ["u1", "u2"] },
          date: { lte: new Date("2026-10-31T00:00:00.000Z") },
          hours_worked: { gt: 0 },
        },
        _max: { date: true },
      });
      expect(result).toEqual(
        new Map([["u1", new Date("2026-10-30T00:00:00.000Z")]])
      );
    });
  });
});
