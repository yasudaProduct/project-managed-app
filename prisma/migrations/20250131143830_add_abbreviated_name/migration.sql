/*
  Warnings:

  - Added the required column `abbreviatedName` to the `users` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "users" ADD COLUMN     "abbreviatedName" TEXT NOT NULL DEFAULT 'default_value';
