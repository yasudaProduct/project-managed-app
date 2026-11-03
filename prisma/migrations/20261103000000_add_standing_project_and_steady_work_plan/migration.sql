-- CreateEnum
CREATE TYPE "ProjectKind" AS ENUM ('PROJECT', 'STANDING');

-- CreateEnum
CREATE TYPE "StandingCategory" AS ENUM ('MAINTENANCE', 'INTERNAL', 'OTHER');

-- CreateEnum
CREATE TYPE "SteadyPlanUnit" AS ENUM ('PER_DAY', 'PER_MONTH');

-- AlterTable
ALTER TABLE "projects" ADD COLUMN     "category" "StandingCategory",
ADD COLUMN     "kind" "ProjectKind" NOT NULL DEFAULT 'PROJECT';

-- CreateTable
CREATE TABLE "steady_work_plan" (
    "id" SERIAL NOT NULL,
    "taskId" INTEGER NOT NULL,
    "unit" "SteadyPlanUnit" NOT NULL,
    "hours" DECIMAL(65,30) NOT NULL,
    "validFrom" DATE NOT NULL,
    "validTo" DATE,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "steady_work_plan_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "steady_work_plan_taskId_validFrom_idx" ON "steady_work_plan"("taskId", "validFrom");

-- AddForeignKey
ALTER TABLE "steady_work_plan" ADD CONSTRAINT "steady_work_plan_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "wbs_task"("id") ON DELETE CASCADE ON UPDATE CASCADE;
