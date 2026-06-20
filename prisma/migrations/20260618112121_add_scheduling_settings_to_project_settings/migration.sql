-- AlterTable
ALTER TABLE "project_settings" ADD COLUMN     "schedulingSettings" JSONB NOT NULL DEFAULT '{}';
