import { MilestoneRepository } from "@/infrastructures/milestone/milestone.repository";
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
});
