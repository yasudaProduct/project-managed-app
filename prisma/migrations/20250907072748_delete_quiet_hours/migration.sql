/*
  Warnings:

  - You are about to drop the column `quietHoursEnd` on the `notification_preferences` table. All the data in the column will be lost.
  - You are about to drop the column `quietHoursStart` on the `notification_preferences` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."notification_preferences" DROP COLUMN "quietHoursEnd",
DROP COLUMN "quietHoursStart";
