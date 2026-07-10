-- AlterTable
ALTER TABLE "wbs_task" ADD COLUMN     "deletedAt" TIMESTAMPTZ,
ADD COLUMN     "isDeleted" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "wbs_task_wbsId_isDeleted_idx" ON "wbs_task"("wbsId", "isDeleted");
