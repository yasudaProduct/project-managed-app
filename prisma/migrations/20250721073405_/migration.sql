/*
  Warnings:

  - The `assigneeId` column on the `wbs_task` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- DropForeignKey
ALTER TABLE "wbs_task" DROP CONSTRAINT "wbs_task_assigneeId_fkey";

-- AlterTable
ALTER TABLE "wbs_task" DROP COLUMN "assigneeId",
ADD COLUMN     "assigneeId" INTEGER;

-- AddForeignKey
ALTER TABLE "wbs_task" ADD CONSTRAINT "wbs_task_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "wbs_assignee"("id") ON DELETE SET NULL ON UPDATE CASCADE;
