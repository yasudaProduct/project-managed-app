"use server";

import prisma from "@/lib/prisma/prisma";

export async function getWbsTasksSummary(wbsId: string) {
  const [kijunKosu, yoteiKosu, taskJisseki, unlinkedWorkRecordsCount] =
    await Promise.all([
      prisma.taskKosu.findMany({
        where: {
          wbsId: Number(wbsId),
          period: { type: "KIJUN" },
        },
        select: { kosu: true },
      }),
      prisma.taskKosu.findMany({
        where: {
          wbsId: Number(wbsId),
          period: { type: "YOTEI" },
        },
        select: { kosu: true },
      }),
      prisma.workRecord.findMany({
        where: { task: { wbsId: Number(wbsId) } },
        select: { hours_worked: true },
      }),
      prisma.workRecord.count({ where: { taskId: null } }),
    ]);

  return {
    taskKosu: yoteiKosu.reduce((acc, curr) => acc + curr.kosu.toNumber(), 0),
    taskJisseki: taskJisseki.reduce(
      (acc, curr) => acc + curr.hours_worked.toNumber(),
      0
    ),
    kijunKosu: kijunKosu.reduce((acc, curr) => acc + curr.kosu.toNumber(), 0),
    unlinkedWorkRecordsCount,
  };
}
