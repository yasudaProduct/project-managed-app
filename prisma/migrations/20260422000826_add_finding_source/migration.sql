-- CreateEnum
CREATE TYPE "public"."FindingSource" AS ENUM ('REVIEW', 'TEST');

-- AlterTable
ALTER TABLE "public"."quality_finding" ADD COLUMN     "source" "public"."FindingSource" NOT NULL DEFAULT 'REVIEW';

-- CreateIndex
CREATE INDEX "quality_finding_source_idx" ON "public"."quality_finding"("source");
