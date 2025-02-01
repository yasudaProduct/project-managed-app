/*
  Warnings:

  - You are about to drop the column `taskId` on the `task_kosu` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "task_kosu" DROP CONSTRAINT "task_kosu_taskId_fkey";

-- AlterTable
ALTER TABLE "task_kosu" DROP COLUMN "taskId";
