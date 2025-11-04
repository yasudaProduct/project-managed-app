-- CreateEnum
CREATE TYPE "public"."ScheduleMatchType" AS ENUM ('EXACT', 'CONTAINS', 'REGEX');

-- AlterTable
ALTER TABLE "public"."project_settings" ADD COLUMN     "considerPersonalSchedule" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "scheduleExcludePatterns" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "scheduleIncludePatterns" TEXT[] DEFAULT ARRAY['休暇', '有給', '休み', '全休', '代休', '振休', '有給休暇']::TEXT[],
ADD COLUMN     "scheduleMatchType" "public"."ScheduleMatchType" NOT NULL DEFAULT 'CONTAINS',
ADD COLUMN     "standardWorkingHours" DECIMAL(65,30) NOT NULL DEFAULT 7.5;
