-- AlterTable
ALTER TABLE "public"."projects" ALTER COLUMN "startDate" SET DATA TYPE DATE,
ALTER COLUMN "endDate" SET DATA TYPE DATE;

-- AlterTable
ALTER TABLE "public"."task_period" ALTER COLUMN "startDate" SET DATA TYPE DATE,
ALTER COLUMN "endDate" SET DATA TYPE DATE;

-- AlterTable
ALTER TABLE "public"."user_schedule" ALTER COLUMN "date" SET DATA TYPE DATE;

-- AlterTable
ALTER TABLE "public"."work_records" ALTER COLUMN "date" SET DATA TYPE DATE;
