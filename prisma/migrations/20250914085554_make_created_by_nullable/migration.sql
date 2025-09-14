-- DropForeignKey
ALTER TABLE "public"."import_jobs" DROP CONSTRAINT "import_jobs_createdBy_fkey";

-- AlterTable
ALTER TABLE "public"."import_jobs" ALTER COLUMN "createdBy" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "public"."import_jobs" ADD CONSTRAINT "import_jobs_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
