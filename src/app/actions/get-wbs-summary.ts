"use server";

import prisma from "@/lib/prisma/prisma";

export async function getWbsTasksSummary(wbsId: string) {
  const [kijunKosu, yoteiKosu, taskJisseki, unlinkedWorkRecordsCount, tasksWithPeriods] =
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
        where: { wbsId: Number(wbsId), taskId: { not: null } },
        select: { hours_worked: true },
      }),
      prisma.workRecord.count({ where: { taskId: null, wbsId: Number(wbsId) } }),
      prisma.wbsTask.findMany({
        where: { wbsId: Number(wbsId), isDeleted: false },
        select: {
          status: true,
          periods: {
            where: { type: "YOTEI" },
            select: {
              startDate: true,
              endDate: true,
              kosus: {
                where: { type: "NORMAL" },
                select: { kosu: true },
              },
            },
          },
        },
      }),
    ]);

  // 予定ベースの集計
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const totalTasks = tasksWithPeriods.length;
  const actualCompleted = tasksWithPeriods.filter(
    (t) => t.status === "COMPLETED"
  ).length;
  const actualInProgress = tasksWithPeriods.filter(
    (t) => t.status === "IN_PROGRESS"
  ).length;

  let plannedCompleted = 0;
  let plannedInProgress = 0;
  let plannedCompletedKosu = 0;
  for (const task of tasksWithPeriods) {
    if (task.status === "ON_HOLD") continue;
    const yoteiPeriod = task.periods[0];
    if (!yoteiPeriod) continue;
    const startDate = new Date(yoteiPeriod.startDate);
    const startDay = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
    const endDate = new Date(yoteiPeriod.endDate);
    const endDay = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
    if (today > endDay) {
      plannedCompleted++;
      plannedCompletedKosu += yoteiPeriod.kosus.reduce(
        (sum, k) => sum + k.kosu.toNumber(),
        0
      );
    } else if (today >= startDay) {
      plannedInProgress++;
    }
  }

  const actualProgress =
    totalTasks > 0 ? Math.round((actualCompleted / totalTasks) * 100) : 0;
  const tasksWithYotei = tasksWithPeriods.filter(
    (t) => t.periods.length > 0 && t.status !== "ON_HOLD"
  ).length;
  const plannedProgress =
    tasksWithYotei > 0
      ? Math.round((plannedCompleted / tasksWithYotei) * 100)
      : 0;

  return {
    taskKosu: yoteiKosu.reduce((acc, curr) => acc + curr.kosu.toNumber(), 0),
    taskJisseki: taskJisseki.reduce(
      (acc, curr) => acc + curr.hours_worked.toNumber(),
      0
    ),
    kijunKosu: kijunKosu.reduce((acc, curr) => acc + curr.kosu.toNumber(), 0),
    unlinkedWorkRecordsCount,
    actualCompleted,
    plannedCompleted,
    actualInProgress,
    plannedInProgress,
    plannedCompletedKosu,
    actualProgress,
    plannedProgress,
  };
}
