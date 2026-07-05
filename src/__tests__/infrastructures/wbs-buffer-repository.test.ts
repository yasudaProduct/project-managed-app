import { WbsBufferRepository } from "@/infrastructures/wbs-buffer-repository";
import prisma from "@/lib/prisma/prisma";

jest.mock('@/lib/prisma/prisma', () => ({
  __esModule: true,
  default: {
    wbsBuffer: {
      findMany: jest.fn(),
    },
  },
}));

describe("WbsBufferRepository", () => {
  let repository: WbsBufferRepository;
  const prismaMock = prisma as jest.Mocked<typeof prisma>;

  beforeEach(() => {
    repository = new WbsBufferRepository();
    jest.clearAllMocks();
  });

  describe("findByWbsId", () => {
    it("wbsIdに紐づくバッファ一覧を返すこと", async () => {
      const dbRows = [
        {
          id: 1,
          wbsId: 10,
          name: "リスクバッファ",
          buffer: 5,
          bufferType: "RISK",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 2,
          wbsId: 10,
          name: "その他バッファ",
          buffer: 3,
          bufferType: "OTHER",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];
      prismaMock.wbsBuffer.findMany.mockResolvedValue(dbRows);

      const result = await repository.findByWbsId(10);

      expect(prismaMock.wbsBuffer.findMany).toHaveBeenCalledWith({
        where: { wbsId: 10 },
      });
      expect(result).toEqual([
        { id: 1, wbsId: 10, name: "リスクバッファ", buffer: 5, bufferType: "RISK" },
        { id: 2, wbsId: 10, name: "その他バッファ", buffer: 3, bufferType: "OTHER" },
      ]);
    });

    it("バッファが存在しない場合、空配列を返すこと", async () => {
      prismaMock.wbsBuffer.findMany.mockResolvedValue([]);

      const result = await repository.findByWbsId(999);

      expect(result).toEqual([]);
    });
  });
});
