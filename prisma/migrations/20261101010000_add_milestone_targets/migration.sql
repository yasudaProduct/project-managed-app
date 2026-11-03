-- CreateEnum
CREATE TYPE "MilestoneTargetType" AS ENUM ('EVENT', 'PHASE', 'TASKS');

-- AlterTable
ALTER TABLE "milestone" ADD COLUMN     "achievedAt" DATE,
ADD COLUMN     "phaseId" INTEGER,
ADD COLUMN     "targetType" "MilestoneTargetType" NOT NULL DEFAULT 'EVENT';

-- CreateTable
CREATE TABLE "milestone_task" (
    "milestoneId" INTEGER NOT NULL,
    "taskId" INTEGER NOT NULL,

    CONSTRAINT "milestone_task_pkey" PRIMARY KEY ("milestoneId","taskId")
);

-- CreateIndex
CREATE INDEX "milestone_task_taskId_idx" ON "milestone_task"("taskId");

-- AddForeignKey
ALTER TABLE "milestone" ADD CONSTRAINT "milestone_phaseId_fkey" FOREIGN KEY ("phaseId") REFERENCES "wbs_phase"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "milestone_task" ADD CONSTRAINT "milestone_task_milestoneId_fkey" FOREIGN KEY ("milestoneId") REFERENCES "milestone"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "milestone_task" ADD CONSTRAINT "milestone_task_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "wbs_task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

