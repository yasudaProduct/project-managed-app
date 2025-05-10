/*
  Warnings:

  - A unique constraint covering the columns `[taskNo,wbsId]` on the table `wbs_task` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "wbs_task_taskNo_key";

-- CreateIndex
CREATE UNIQUE INDEX "wbs_task_taskNo_wbsId_key" ON "wbs_task"("taskNo", "wbsId");
