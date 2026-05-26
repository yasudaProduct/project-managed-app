-- AlterTable
ALTER TABLE "work_records" ADD COLUMN     "wbsId" INTEGER;

-- BackfillExistingData
UPDATE "work_records" wr
SET "wbsId" = (SELECT wt."wbsId" FROM "wbs_task" wt WHERE wt."id" = wr."taskId")
WHERE wr."taskId" IS NOT NULL;

-- AddForeignKey
ALTER TABLE "work_records" ADD CONSTRAINT "work_records_wbsId_fkey" FOREIGN KEY ("wbsId") REFERENCES "wbs"("id") ON DELETE SET NULL ON UPDATE CASCADE;
