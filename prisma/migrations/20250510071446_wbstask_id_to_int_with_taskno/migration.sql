/*
  Warnings:

  - The primary key for the `wbs_task` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `id` column on the `wbs_task` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `taskId` column on the `work_records` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - A unique constraint covering the columns `[taskNo]` on the table `wbs_task` will be added. If there are existing duplicate values, this will fail.
  - Changed the type of `taskId` on the `task_period` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `taskId` on the `task_status_log` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Added the required column `taskNo` to the `wbs_task` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "task_period" DROP CONSTRAINT "task_period_taskId_fkey";

-- DropForeignKey
ALTER TABLE "task_status_log" DROP CONSTRAINT "task_status_log_taskId_fkey";

-- DropForeignKey
ALTER TABLE "work_records" DROP CONSTRAINT "work_records_taskId_fkey";

-- DropIndex
DROP INDEX "wbs_task_id_wbsId_key";

-- AlterTable
ALTER TABLE "task_period" DROP COLUMN "taskId",
ADD COLUMN     "taskId" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "task_status_log" DROP COLUMN "taskId",
ADD COLUMN     "taskId" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "wbs_task" DROP CONSTRAINT "wbs_task_pkey",
ADD COLUMN     "taskNo" TEXT NOT NULL,
DROP COLUMN "id",
ADD COLUMN     "id" SERIAL NOT NULL,
ADD CONSTRAINT "wbs_task_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "work_records" DROP COLUMN "taskId",
ADD COLUMN     "taskId" INTEGER;

-- CreateIndex
CREATE UNIQUE INDEX "wbs_task_taskNo_key" ON "wbs_task"("taskNo");

-- AddForeignKey
ALTER TABLE "task_period" ADD CONSTRAINT "task_period_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "wbs_task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_status_log" ADD CONSTRAINT "task_status_log_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "wbs_task"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_records" ADD CONSTRAINT "work_records_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "wbs_task"("id") ON DELETE SET NULL ON UPDATE CASCADE;
