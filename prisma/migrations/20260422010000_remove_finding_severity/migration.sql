-- DropIndex
DROP INDEX "public"."quality_finding_severity_idx";

-- AlterTable
ALTER TABLE "public"."quality_finding" DROP COLUMN "severity";

-- DropEnum
DROP TYPE "public"."QualitySeverity";
