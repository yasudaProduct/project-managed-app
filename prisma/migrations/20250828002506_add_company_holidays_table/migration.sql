-- CreateEnum
CREATE TYPE "public"."CompanyHolidayType" AS ENUM ('NATIONAL', 'COMPANY', 'SPECIAL');

-- AlterEnum
ALTER TYPE "public"."TaskStatus" ADD VALUE 'ON_HOLD';

-- CreateTable
CREATE TABLE "public"."company_holidays" (
    "id" SERIAL NOT NULL,
    "date" DATE NOT NULL,
    "name" TEXT NOT NULL,
    "type" "public"."CompanyHolidayType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "company_holidays_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "company_holidays_date_idx" ON "public"."company_holidays"("date");

-- CreateIndex
CREATE UNIQUE INDEX "company_holidays_date_key" ON "public"."company_holidays"("date");
