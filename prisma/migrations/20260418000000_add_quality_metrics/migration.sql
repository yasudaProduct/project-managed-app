-- CreateEnum
CREATE TYPE "public"."QualityDocumentType" AS ENUM ('DESIGN', 'CODE', 'TEST', 'OTHER');

-- CreateEnum
CREATE TYPE "public"."QualityReviewType" AS ENUM ('PEER', 'FORMAL', 'INSPECTION', 'OTHER');

-- CreateEnum
CREATE TYPE "public"."QualitySizeUnit" AS ENUM ('PAGE', 'LINES_OF_CODE', 'TEST_CASE');

-- CreateEnum
CREATE TYPE "public"."QualitySeverity" AS ENUM ('MAJOR', 'MINOR', 'INFO');

-- CreateTable
CREATE TABLE "public"."quality_review_target" (
    "id" SERIAL NOT NULL,
    "wbsId" INTEGER NOT NULL,
    "taskNo" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "documentType" "public"."QualityDocumentType" NOT NULL DEFAULT 'OTHER',
    "reviewType" "public"."QualityReviewType" NOT NULL DEFAULT 'PEER',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "quality_review_target_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."quality_reviewer" (
    "id" SERIAL NOT NULL,
    "targetId" INTEGER NOT NULL,
    "reviewerUserId" TEXT NOT NULL,
    "reviewTaskNo" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "quality_reviewer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."quality_size_metric" (
    "id" SERIAL NOT NULL,
    "targetId" INTEGER NOT NULL,
    "unit" "public"."QualitySizeUnit" NOT NULL,
    "value" DECIMAL(12,2) NOT NULL,
    "measuredAt" DATE NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "quality_size_metric_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."quality_finding" (
    "id" SERIAL NOT NULL,
    "targetId" INTEGER NOT NULL,
    "severity" "public"."QualitySeverity" NOT NULL DEFAULT 'MINOR',
    "category" TEXT,
    "description" TEXT,
    "foundAt" DATE NOT NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "quality_finding_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "public"."project_settings" ADD COLUMN "qualityThresholds" JSONB;

-- CreateIndex
CREATE UNIQUE INDEX "quality_review_target_wbsId_taskNo_key" ON "public"."quality_review_target"("wbsId", "taskNo");

-- CreateIndex
CREATE INDEX "quality_review_target_wbsId_isActive_idx" ON "public"."quality_review_target"("wbsId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "quality_reviewer_targetId_reviewTaskNo_key" ON "public"."quality_reviewer"("targetId", "reviewTaskNo");

-- CreateIndex
CREATE INDEX "quality_reviewer_reviewerUserId_idx" ON "public"."quality_reviewer"("reviewerUserId");

-- CreateIndex
CREATE UNIQUE INDEX "quality_size_metric_targetId_unit_key" ON "public"."quality_size_metric"("targetId", "unit");

-- CreateIndex
CREATE INDEX "quality_size_metric_measuredAt_idx" ON "public"."quality_size_metric"("measuredAt");

-- CreateIndex
CREATE INDEX "quality_finding_targetId_foundAt_idx" ON "public"."quality_finding"("targetId", "foundAt");

-- CreateIndex
CREATE INDEX "quality_finding_severity_idx" ON "public"."quality_finding"("severity");

-- AddForeignKey
ALTER TABLE "public"."quality_reviewer" ADD CONSTRAINT "quality_reviewer_targetId_fkey" FOREIGN KEY ("targetId") REFERENCES "public"."quality_review_target"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."quality_size_metric" ADD CONSTRAINT "quality_size_metric_targetId_fkey" FOREIGN KEY ("targetId") REFERENCES "public"."quality_review_target"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."quality_finding" ADD CONSTRAINT "quality_finding_targetId_fkey" FOREIGN KEY ("targetId") REFERENCES "public"."quality_review_target"("id") ON DELETE CASCADE ON UPDATE CASCADE;
