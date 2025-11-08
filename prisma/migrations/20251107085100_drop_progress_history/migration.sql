/*
  Warnings:

  - You are about to drop the `task_progress_history` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `wbs_progress_history` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."task_progress_history" DROP CONSTRAINT "task_progress_history_wbsProgressHistoryId_fkey";

-- DropForeignKey
ALTER TABLE "public"."wbs_progress_history" DROP CONSTRAINT "wbs_progress_history_wbsId_fkey";

-- DropTable
DROP TABLE "public"."task_progress_history";

-- DropTable
DROP TABLE "public"."wbs_progress_history";

-- DropEnum
DROP TYPE "public"."RecordType";
