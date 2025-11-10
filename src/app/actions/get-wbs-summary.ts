"use server";

import prisma from "@/lib/prisma/prisma";

export async function getWbsTasksSummary(wbsId: string) {

  // 基準工数合計
  const kijunKosu = await prisma.taskKosu.findMany({
    where: {
      wbsId: Number(wbsId),
      period: {
        type: 'KIJUN',
      }
    },
    select: {
      kosu: true,
    }
  });

  // 予定工数合計
  const yoteiKosu = await prisma.taskKosu.findMany({
    where: {
      wbsId: Number(wbsId),
      period: {
        type: 'YOTEI',
      }
    },
    select: {
      kosu: true,
    }
  });

  // 実績工数合計
  const taskJisseki = await prisma.workRecord.findMany({
    where: {
      task: {
        wbsId: Number(wbsId),
      },
    },
    select: {
      hours_worked: true,
    },
  });

  return {
    taskKosu: yoteiKosu.reduce((acc, curr) => acc + curr.kosu.toNumber(), 0),
    taskJisseki: taskJisseki.reduce((acc, curr) => acc + curr.hours_worked.toNumber(), 0),
    kijunKosu: kijunKosu.reduce((acc, curr) => acc + curr.kosu.toNumber(), 0)
  };
}