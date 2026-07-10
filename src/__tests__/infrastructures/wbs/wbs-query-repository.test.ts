import { WbsQueryRepository } from "@/infrastructures/wbs/wbs-query-repository";
import prisma from "@/lib/prisma/prisma";

jest.mock("@/lib/prisma/prisma", () => ({
  __esModule: true,
  default: {
    workRecord: {
      count: jest.fn(),
    },
  },
}));

describe("WbsQueryRepository", () => {
  let repository: WbsQueryRepository;
  const prismaMock = prisma as jest.Mocked<typeof prisma>;

  beforeEach(() => {
    repository = new WbsQueryRepository();
    jest.clearAllMocks();
  });

  describe("getUnlinkedWorkRecordsCount", () => {
    it("taskIdが未紐付けの作業実績件数を返すこと", async () => {
      (prismaMock.workRecord.count as jest.Mock).mockResolvedValue(3);

      const result = await repository.getUnlinkedWorkRecordsCount(1);

      expect(prismaMock.workRecord.count).toHaveBeenCalledWith({
        where: { taskId: null, wbsId: 1 },
      });
      expect(result).toBe(3);
    });
  });
});
