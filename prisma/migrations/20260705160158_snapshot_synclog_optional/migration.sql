-- DropForeignKey
ALTER TABLE "task_progress_snapshot" DROP CONSTRAINT "task_progress_snapshot_syncLogId_fkey";

-- AlterTable
ALTER TABLE "task_progress_snapshot" ALTER COLUMN "syncLogId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "task_progress_snapshot" ADD CONSTRAINT "task_progress_snapshot_syncLogId_fkey" FOREIGN KEY ("syncLogId") REFERENCES "sync_logs"("id") ON DELETE SET NULL ON UPDATE CASCADE;
