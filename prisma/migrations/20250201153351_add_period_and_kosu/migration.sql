-- CreateEnum
CREATE TYPE "PeriodType" AS ENUM ('KIJUN', 'YOTEI', 'JISSEKI');

-- CreateEnum
CREATE TYPE "KosuType" AS ENUM ('NORMAL', 'RISK');

-- CreateTable
CREATE TABLE "task_period" (
    "id" SERIAL NOT NULL,
    "taskId" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "type" "PeriodType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "task_period_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "task_kosu" (
    "id" SERIAL NOT NULL,
    "taskId" TEXT NOT NULL,
    "kosu" INTEGER NOT NULL,
    "periodId" INTEGER NOT NULL,
    "type" "KosuType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "task_kosu_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "task_period" ADD CONSTRAINT "task_period_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "wbs_task"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_kosu" ADD CONSTRAINT "task_kosu_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "wbs_task"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_kosu" ADD CONSTRAINT "task_kosu_periodId_fkey" FOREIGN KEY ("periodId") REFERENCES "task_period"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
