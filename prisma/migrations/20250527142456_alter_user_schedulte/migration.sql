/*
  Warnings:

  - You are about to drop the column `note` on the `user_schedule` table. All the data in the column will be lost.
  - You are about to drop the column `type` on the `user_schedule` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "user_schedule" DROP COLUMN "note",
DROP COLUMN "type",
ADD COLUMN     "description" TEXT,
ADD COLUMN     "location" TEXT,
ALTER COLUMN "startTime" SET DATA TYPE TEXT,
ALTER COLUMN "endTime" SET DATA TYPE TEXT;
