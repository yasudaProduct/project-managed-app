/*
  Warnings:

  - You are about to drop the column `abbreviatedName` on the `users` table. All the data in the column will be lost.
  - Added the required column `displayName` to the `users` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "users" DROP COLUMN "abbreviatedName",
ADD COLUMN     "displayName" TEXT NOT NULL;
