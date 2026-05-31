-- CreateEnum
CREATE TYPE "EvmForecastMethod" AS ENUM ('CPI_ONLY', 'CPI_SPI', 'PLANNED');

-- AlterTable
ALTER TABLE "project_settings" ADD COLUMN     "evmForecastMethod" "EvmForecastMethod" NOT NULL DEFAULT 'CPI_ONLY';
