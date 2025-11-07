"use server";

import prisma from "@/lib/prisma/prisma";

export async function getWbsTasksSummary(wbsId: string) {

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
    taskJisseki: taskJisseki.reduce((acc, curr) => acc + curr.hours_worked.toNumber(), 0)
  };
}