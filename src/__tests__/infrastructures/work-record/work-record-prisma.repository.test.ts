import { WorkRecordPrismaRepository } from "@/infrastructures/work-record/work-record-prisma.repository";
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
    },
  },
}));

describe("WorkRecordPrismaRepository", () => {
  let repository: WorkRecordPrismaRepository;
  const prismaMock = prisma as jest.Mocked<typeof prisma>;

  beforeEach(() => {
    repository = new WorkRecordPrismaRepository();
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
});
