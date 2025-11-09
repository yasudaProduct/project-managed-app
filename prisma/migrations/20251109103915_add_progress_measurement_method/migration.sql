-- CreateEnum
CREATE TYPE "public"."ProgressMeasurementMethod" AS ENUM ('ZERO_HUNDRED', 'FIFTY_FIFTY', 'SELF_REPORTED');

-- AlterTable
ALTER TABLE "public"."project_settings" ADD COLUMN     "progressMeasurementMethod" "public"."ProgressMeasurementMethod" NOT NULL DEFAULT 'SELF_REPORTED';
