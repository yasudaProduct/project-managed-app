/*
  Warnings:

  - A unique constraint covering the columns `[id,wbsId]` on the table `wbs_task` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "wbs_task_id_wbsId_key" ON "wbs_task"("id", "wbsId");
