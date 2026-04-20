/**
 * @jest-environment node
 */

jest.mock("@/lib/prisma/prisma", () => ({
  __esModule: true,
  default: {
    taskKosu: {
      findMany: jest.fn(),
    },
    workRecord: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
  },
}));

import prisma from "@/lib/prisma/prisma";
import { getWbsTasksSummary } from "@/app/actions/get-wbs-summary";

const mockedPrisma = prisma as unknown as {
  taskKosu: { findMany: jest.Mock };
  workRecord: { findMany: jest.Mock; count: jest.Mock };
};

describe("getWbsTasksSummary", () => {
  beforeEach(() => {
    mockedPrisma.taskKosu.findMany.mockReset();
    mockedPrisma.workRecord.findMany.mockReset();
    mockedPrisma.workRecord.count.mockReset();
  });

  it("unlinkedWorkRecordsCount が戻り値に含まれる", async () => {
    mockedPrisma.taskKosu.findMany.mockResolvedValue([]);
    mockedPrisma.workRecord.findMany.mockResolvedValue([]);
    mockedPrisma.workRecord.count.mockResolvedValue(0);

    const result = await getWbsTasksSummary("1");

    expect(result).toHaveProperty("unlinkedWorkRecordsCount");
  });

  it("taskId=null のレコードが 3件のとき unlinkedWorkRecordsCount=3 を返す", async () => {
    mockedPrisma.taskKosu.findMany.mockResolvedValue([]);
    mockedPrisma.workRecord.findMany.mockResolvedValue([]);
    mockedPrisma.workRecord.count.mockResolvedValue(3);

    const result = await getWbsTasksSummary("1");

    expect(result.unlinkedWorkRecordsCount).toBe(3);
    expect(mockedPrisma.workRecord.count).toHaveBeenCalledWith({
      where: { taskId: null },
    });
  });

  it("全件 taskId が紐付いている場合 unlinkedWorkRecordsCount=0 を返す", async () => {
    mockedPrisma.taskKosu.findMany.mockResolvedValue([]);
    mockedPrisma.workRecord.findMany.mockResolvedValue([]);
    mockedPrisma.workRecord.count.mockResolvedValue(0);

    const result = await getWbsTasksSummary("1");

    expect(result.unlinkedWorkRecordsCount).toBe(0);
  });
});
