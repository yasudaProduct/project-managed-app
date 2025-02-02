-- DropForeignKey
ALTER TABLE "task_kosu" DROP CONSTRAINT "task_kosu_periodId_fkey";

-- AddForeignKey
ALTER TABLE "task_kosu" ADD CONSTRAINT "task_kosu_periodId_fkey" FOREIGN KEY ("periodId") REFERENCES "task_period"("id") ON DELETE CASCADE ON UPDATE CASCADE;
