-- DropTables: 既存品質管理テーブルを削除
DROP TABLE IF EXISTS "quality_finding" CASCADE;
DROP TABLE IF EXISTS "quality_size_metric" CASCADE;
DROP TABLE IF EXISTS "quality_reviewer" CASCADE;
DROP TABLE IF EXISTS "quality_review_target" CASCADE;

-- DropEnums: 不要になったenum型を削除
DROP TYPE IF EXISTS "QualityDocumentType";
DROP TYPE IF EXISTS "QualityReviewType";

-- AlterEnum: QualitySizeUnit を再構築（LINES_OF_CODE → LOC, FP追加）
-- PostgreSQLではenumの値を削除できないため、再作成する
ALTER TYPE "QualitySizeUnit" RENAME TO "QualitySizeUnit_old";
CREATE TYPE "QualitySizeUnit" AS ENUM ('PAGE', 'LOC', 'FP', 'TEST_CASE');
DROP TYPE "QualitySizeUnit_old";

-- CreateTable: 評価対象
CREATE TABLE "quality_target" (
    "id" SERIAL NOT NULL,
    "wbsId" INTEGER NOT NULL,
    "taskNo" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "subsystem" TEXT,
    "featureGroup" TEXT,
    "phaseCode" TEXT,
    "assigneeId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "quality_target_pkey" PRIMARY KEY ("id")
);

-- CreateTable: レビュー担当者
CREATE TABLE "quality_reviewer" (
    "id" SERIAL NOT NULL,
    "targetId" INTEGER NOT NULL,
    "reviewerUserId" TEXT NOT NULL,
    "reviewTaskNo" TEXT NOT NULL,
    "reviewHours" DECIMAL(8,2),
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "quality_reviewer_pkey" PRIMARY KEY ("id")
);

-- CreateTable: 規模データ
CREATE TABLE "quality_size_metric" (
    "id" SERIAL NOT NULL,
    "targetId" INTEGER NOT NULL,
    "unit" "QualitySizeUnit" NOT NULL,
    "value" DECIMAL(12,2) NOT NULL,
    "measuredAt" DATE NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "quality_size_metric_pkey" PRIMARY KEY ("id")
);

-- CreateTable: 指摘/バグ統合
CREATE TABLE "quality_finding" (
    "id" SERIAL NOT NULL,
    "targetId" INTEGER NOT NULL,
    "source" "FindingSource" NOT NULL DEFAULT 'REVIEW',
    "injectionPhase" TEXT,
    "phenomenonType" TEXT,
    "causeType" TEXT,
    "category" TEXT,
    "description" TEXT,
    "foundAt" DATE NOT NULL,
    "resolvedAt" DATE,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "quality_finding_pkey" PRIMARY KEY ("id")
);

-- CreateTable: テスト進捗（PB曲線用）
CREATE TABLE "quality_test_progress" (
    "id" SERIAL NOT NULL,
    "targetId" INTEGER NOT NULL,
    "date" DATE NOT NULL,
    "plannedTotal" INTEGER NOT NULL,
    "executedTotal" INTEGER NOT NULL,
    "passedTotal" INTEGER NOT NULL,
    "failedTotal" INTEGER NOT NULL,
    "blockedTotal" INTEGER NOT NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "quality_test_progress_pkey" PRIMARY KEY ("id")
);

-- CreateTable: 基準値/閾値設定
CREATE TABLE "quality_threshold_config" (
    "id" SERIAL NOT NULL,
    "wbsId" INTEGER NOT NULL,
    "metricKey" TEXT NOT NULL,
    "phaseCode" TEXT,
    "upperLimit" DECIMAL(12,4),
    "lowerLimit" DECIMAL(12,4),
    "warnThreshold" DECIMAL(12,4),
    "dangerThreshold" DECIMAL(12,4),
    "referenceValue" DECIMAL(12,4),
    "note" TEXT,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "quality_threshold_config_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "quality_target_wbsId_taskNo_key" ON "quality_target"("wbsId", "taskNo");
CREATE INDEX "quality_target_wbsId_isActive_idx" ON "quality_target"("wbsId", "isActive");

CREATE UNIQUE INDEX "quality_reviewer_targetId_reviewTaskNo_key" ON "quality_reviewer"("targetId", "reviewTaskNo");
CREATE INDEX "quality_reviewer_reviewerUserId_idx" ON "quality_reviewer"("reviewerUserId");

CREATE UNIQUE INDEX "quality_size_metric_targetId_unit_key" ON "quality_size_metric"("targetId", "unit");
CREATE INDEX "quality_size_metric_measuredAt_idx" ON "quality_size_metric"("measuredAt");

CREATE INDEX "quality_finding_targetId_foundAt_idx" ON "quality_finding"("targetId", "foundAt");
CREATE INDEX "quality_finding_source_idx" ON "quality_finding"("source");

CREATE UNIQUE INDEX "quality_test_progress_targetId_date_key" ON "quality_test_progress"("targetId", "date");

CREATE UNIQUE INDEX "quality_threshold_config_wbsId_metricKey_phaseCode_key" ON "quality_threshold_config"("wbsId", "metricKey", "phaseCode");

-- AddForeignKey
ALTER TABLE "quality_reviewer" ADD CONSTRAINT "quality_reviewer_targetId_fkey" FOREIGN KEY ("targetId") REFERENCES "quality_target"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "quality_size_metric" ADD CONSTRAINT "quality_size_metric_targetId_fkey" FOREIGN KEY ("targetId") REFERENCES "quality_target"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "quality_finding" ADD CONSTRAINT "quality_finding_targetId_fkey" FOREIGN KEY ("targetId") REFERENCES "quality_target"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "quality_test_progress" ADD CONSTRAINT "quality_test_progress_targetId_fkey" FOREIGN KEY ("targetId") REFERENCES "quality_target"("id") ON DELETE CASCADE ON UPDATE CASCADE;
