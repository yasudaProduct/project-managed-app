-- DropForeignKey
ALTER TABLE "task_period" DROP CONSTRAINT "task_period_taskId_fkey";

-- AddForeignKey
ALTER TABLE "task_period" ADD CONSTRAINT "task_period_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "wbs_task"("id") ON DELETE CASCADE ON UPDATE CASCADE;
