-- CreateEnum
CREATE TYPE "public"."ForecastCalculationMethod" AS ENUM ('CONSERVATIVE', 'REALISTIC', 'OPTIMISTIC', 'PLANNED_OR_ACTUAL');

-- AlterTable
ALTER TABLE "public"."project_settings" ADD COLUMN     "forecastCalculationMethod" "public"."ForecastCalculationMethod" NOT NULL DEFAULT 'REALISTIC';
