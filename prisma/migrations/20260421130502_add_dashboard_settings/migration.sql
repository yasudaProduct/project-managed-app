-- AlterTable
ALTER TABLE "public"."project_settings" ADD COLUMN     "costOverrunThresholdPct" INTEGER NOT NULL DEFAULT 100,
ADD COLUMN     "deadlineAlertDays" INTEGER NOT NULL DEFAULT 1;
