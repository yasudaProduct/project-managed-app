-- CreateEnum
CREATE TYPE "EvmBufferCostMethod" AS ENUM ('AVERAGE_RATE', 'DEFAULT_RATE', 'EXCLUDE');

-- CreateEnum
CREATE TYPE "EvmPvDistribution" AS ENUM ('CALENDAR', 'BUSINESS_DAYS');

-- AlterTable
ALTER TABLE "project_settings"
  ADD COLUMN "evmBufferCostMethod" "EvmBufferCostMethod" NOT NULL DEFAULT 'AVERAGE_RATE',
  ADD COLUMN "evmPvDistribution" "EvmPvDistribution" NOT NULL DEFAULT 'CALENDAR',
  ADD COLUMN "evmHealthyThresholdPct" INTEGER NOT NULL DEFAULT 90,
  ADD COLUMN "evmWarningThresholdPct" INTEGER NOT NULL DEFAULT 80;
