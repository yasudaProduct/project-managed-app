-- DropTable
DROP TABLE IF EXISTS "public"."quality_finding";
DROP TABLE IF EXISTS "public"."quality_size_metric";
DROP TABLE IF EXISTS "public"."quality_reviewer";
DROP TABLE IF EXISTS "public"."quality_review_target";

-- DropEnum
DROP TYPE IF EXISTS "public"."QualityDocumentType";
DROP TYPE IF EXISTS "public"."QualityReviewType";
DROP TYPE IF EXISTS "public"."QualitySizeUnit";
DROP TYPE IF EXISTS "public"."QualitySeverity";

-- AlterTable
ALTER TABLE "public"."project_settings" DROP COLUMN IF EXISTS "qualityThresholds";
