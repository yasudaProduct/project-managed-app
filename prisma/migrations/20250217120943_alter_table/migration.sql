/*
  Warnings:

  - You are about to drop the column `order` on the `phase_template` table. All the data in the column will be lost.
  - You are about to drop the column `jissekiEndDate` on the `wbs_task` table. All the data in the column will be lost.
  - You are about to drop the column `jissekiKosu` on the `wbs_task` table. All the data in the column will be lost.
  - You are about to drop the column `jissekiStartDate` on the `wbs_task` table. All the data in the column will be lost.
  - You are about to drop the column `kijunEndDate` on the `wbs_task` table. All the data in the column will be lost.
  - You are about to drop the column `kijunKosu` on the `wbs_task` table. All the data in the column will be lost.
  - You are about to drop the column `kijunStartDate` on the `wbs_task` table. All the data in the column will be lost.
  - You are about to drop the column `yoteiEndDate` on the `wbs_task` table. All the data in the column will be lost.
  - You are about to drop the column `yoteiKosu` on the `wbs_task` table. All the data in the column will be lost.
  - You are about to drop the column `yoteiStartDate` on the `wbs_task` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[code]` on the table `phase_template` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[code]` on the table `wbs_phase` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `code` to the `phase_template` table without a default value. This is not possible if the table is not empty.
  - Added the required column `code` to the `wbs_phase` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "phase_template" DROP COLUMN "order",
ADD COLUMN     "code" TEXT NOT NULL,
ADD COLUMN     "seq" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "wbs_phase" ADD COLUMN     "code" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "wbs_task" DROP COLUMN "jissekiEndDate",
DROP COLUMN "jissekiKosu",
DROP COLUMN "jissekiStartDate",
DROP COLUMN "kijunEndDate",
DROP COLUMN "kijunKosu",
DROP COLUMN "kijunStartDate",
DROP COLUMN "yoteiEndDate",
DROP COLUMN "yoteiKosu",
DROP COLUMN "yoteiStartDate";

-- CreateIndex
CREATE UNIQUE INDEX "phase_template_code_key" ON "phase_template"("code");

-- CreateIndex
CREATE UNIQUE INDEX "wbs_phase_code_key" ON "wbs_phase"("code");
