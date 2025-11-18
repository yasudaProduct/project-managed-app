-- AlterTable
ALTER TABLE "public"."project_settings" ADD COLUMN     "evmExcludeSettings" JSONB NOT NULL DEFAULT '{}';
