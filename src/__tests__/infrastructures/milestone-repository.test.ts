import { MilestoneRepository } from "@/infrastructures/milestone/milestone-repository";
import prisma from "@/lib/prisma/prisma";

jest.mock('@/lib/prisma/prisma', () => ({
  __esModule: true,
  default: {
    milestone: {
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  },
}));

describe("MilestoneRepository", () => {
  let repository: MilestoneRepository;
  const prismaMock = prisma as jest.Mocked<typeof prisma>;

  beforeEach(() => {
    repository = new MilestoneRepository();
    jest.clearAllMocks();
  });

  describe("create", () => {
    it("wbsIdに紐づくマイルストーンを作成すること", async () => {
      prismaMock.milestone.create.mockResolvedValue({
        id: 1,
        name: "リリース",
        date: new Date("2025-01-01"),
        wbsId: 10,
      });

      const result = await repository.create(10, { name: "リリース", date: new Date("2025-01-01") });

      expect(prismaMock.milestone.create).toHaveBeenCalledWith({
        data: { wbsId: 10, name: "リリース", date: new Date("2025-01-01") },
      });
      expect(result.id).toBe(1);
      expect(result.name).toBe("リリース");
    });
  });

  describe("update", () => {
    it("マイルストーンを更新すること", async () => {
      prismaMock.milestone.update.mockResolvedValue({
        id: 1,
        name: "リリース(変更)",
        date: new Date("2025-02-01"),
        wbsId: 10,
      });

      const result = await repository.update(1, { name: "リリース(変更)", date: new Date("2025-02-01") });

      expect(prismaMock.milestone.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { name: "リリース(変更)", date: new Date("2025-02-01") },
      });
      expect(result.name).toBe("リリース(変更)");
    });
  });

  describe("delete", () => {
    it("マイルストーンを削除すること", async () => {
      prismaMock.milestone.delete.mockResolvedValue({
        id: 1,
        name: "リリース",
        date: new Date("2025-01-01"),
        wbsId: 10,
      });

      await repository.delete(1);

      expect(prismaMock.milestone.delete).toHaveBeenCalledWith({ where: { id: 1 } });
    });
  });

  describe("対象（フェーズ完了型・タスク指定型）と達成日", () => {
    it("findByWbsId は対象・紐付けタスク・達成日を返すこと", async () => {
      (prismaMock.milestone.findMany as jest.Mock).mockResolvedValue([
        {
          id: 1,
          name: "結合テスト完了",
          date: new Date("2026-11-30T00:00:00.000Z"),
          wbsId: 10,
          targetType: "TASKS",
          phaseId: null,
          achievedAt: new Date("2026-11-28T00:00:00.000Z"),
          tasks: [{ taskId: 5 }, { taskId: 6 }],
        },
      ]);

      const [milestone] = await repository.findByWbsId(10);

      expect(prismaMock.milestone.findMany).toHaveBeenCalledWith({
        where: { wbsId: 10 },
        include: { tasks: { select: { taskId: true } } },
      });
      expect(milestone.target).toEqual({ targetType: "TASKS", taskIds: [5, 6] });
      expect(milestone.achievedAt).toEqual(new Date("2026-11-28T00:00:00.000Z"));
    });

    it("create でタスク指定型の紐付けと達成日を保存すること", async () => {
      (prismaMock.milestone.create as jest.Mock).mockResolvedValue({
        id: 2,
        name: "中間リリース",
        date: new Date("2026-12-01T00:00:00.000Z"),
        wbsId: 10,
        targetType: "TASKS",
        phaseId: null,
        achievedAt: null,
        tasks: [{ taskId: 5 }],
      });

      await repository.create(10, {
        name: "中間リリース",
        date: new Date("2026-12-01T00:00:00.000Z"),
        target: { targetType: "TASKS", taskIds: [5] },
        achievedAt: null,
      });

      expect(prismaMock.milestone.create).toHaveBeenCalledWith({
        data: {
          wbsId: 10,
          name: "中間リリース",
          date: new Date("2026-12-01T00:00:00.000Z"),
          targetType: "TASKS",
          phaseId: null,
          tasks: { create: [{ taskId: 5 }] },
          achievedAt: null,
        },
      });
    });

    it("update で対象を変えると紐付けタスクを置き換えること", async () => {
      (prismaMock.milestone.update as jest.Mock).mockResolvedValue({
        id: 1,
        name: "設計完了",
        date: new Date("2026-11-30T00:00:00.000Z"),
        wbsId: 10,
        targetType: "PHASE",
        phaseId: 3,
        achievedAt: null,
        tasks: [],
      });

      await repository.update(1, {
        name: "設計完了",
        date: new Date("2026-11-30T00:00:00.000Z"),
        target: { targetType: "PHASE", phaseId: 3 },
      });

      expect(prismaMock.milestone.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: {
          name: "設計完了",
          date: new Date("2026-11-30T00:00:00.000Z"),
          targetType: "PHASE",
          phaseId: 3,
          tasks: { deleteMany: {}, create: [] },
        },
      });
    });
  });
});
