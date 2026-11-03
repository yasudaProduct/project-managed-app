-- CreateEnum
CREATE TYPE "ProgressReviewCycle" AS ENUM ('DAILY', 'WEEKLY', 'MONTHLY');

-- AlterTable
ALTER TABLE "project_settings" ADD COLUMN "progressReviewCycle" "ProgressReviewCycle" NOT NULL DEFAULT 'WEEKLY';
