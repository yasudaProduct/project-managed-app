/*
  Warnings:

  - The values [JISSEKI] on the enum `PeriodType` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "public"."PeriodType_new" AS ENUM ('KIJUN', 'YOTEI');
ALTER TABLE "public"."task_period" ALTER COLUMN "type" TYPE "public"."PeriodType_new" USING ("type"::text::"public"."PeriodType_new");
ALTER TYPE "public"."PeriodType" RENAME TO "PeriodType_old";
ALTER TYPE "public"."PeriodType_new" RENAME TO "PeriodType";
DROP TYPE "public"."PeriodType_old";
COMMIT;
