/*
  Warnings:

  - You are about to drop the column `isHoliday` on the `user_schedule` table. All the data in the column will be lost.
  - Added the required column `type` to the `user_schedule` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "user_schedule" DROP COLUMN "isHoliday",
ADD COLUMN     "type" TEXT NOT NULL;
