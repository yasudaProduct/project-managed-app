/*
  Warnings:

  - Added the required column `wbsId` to the `task_kosu` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "task_kosu" ADD COLUMN     "wbsId" INTEGER NOT NULL;

-- AddForeignKey
ALTER TABLE "task_kosu" ADD CONSTRAINT "task_kosu_wbsId_fkey" FOREIGN KEY ("wbsId") REFERENCES "wbs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
