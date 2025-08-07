-- CreateEnum
CREATE TYPE "public"."RecordType" AS ENUM ('AUTO', 'MANUAL_SNAPSHOT');

-- CreateTable
CREATE TABLE "public"."wbs_progress_history" (
    "id" SERIAL NOT NULL,
    "wbsId" INTEGER NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "recordType" "public"."RecordType" NOT NULL,
    "snapshotName" TEXT,
    "totalTaskCount" INTEGER NOT NULL,
    "completedCount" INTEGER NOT NULL,
    "inProgressCount" INTEGER NOT NULL,
    "notStartedCount" INTEGER NOT NULL,
    "completionRate" DECIMAL(65,30) NOT NULL,
    "plannedManHours" DECIMAL(65,30) NOT NULL,
    "actualManHours" DECIMAL(65,30) NOT NULL,
    "varianceManHours" DECIMAL(65,30) NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "wbs_progress_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."task_progress_history" (
    "id" SERIAL NOT NULL,
    "wbsProgressHistoryId" INTEGER NOT NULL,
    "taskId" INTEGER NOT NULL,
    "taskNo" TEXT NOT NULL,
    "taskName" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "assigneeId" INTEGER,
    "assigneeName" TEXT,
    "phaseId" INTEGER,
    "phaseName" TEXT,
    "plannedStartDate" TIMESTAMP(3),
    "plannedEndDate" TIMESTAMP(3),
    "actualStartDate" TIMESTAMP(3),
    "actualEndDate" TIMESTAMP(3),
    "plannedManHours" DECIMAL(65,30) NOT NULL,
    "actualManHours" DECIMAL(65,30) NOT NULL,
    "progressRate" DECIMAL(65,30) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "task_progress_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "wbs_progress_history_wbsId_recordedAt_idx" ON "public"."wbs_progress_history"("wbsId", "recordedAt");

-- CreateIndex
CREATE INDEX "task_progress_history_wbsProgressHistoryId_idx" ON "public"."task_progress_history"("wbsProgressHistoryId");

-- CreateIndex
CREATE INDEX "task_progress_history_taskId_idx" ON "public"."task_progress_history"("taskId");

-- AddForeignKey
ALTER TABLE "public"."wbs_progress_history" ADD CONSTRAINT "wbs_progress_history_wbsId_fkey" FOREIGN KEY ("wbsId") REFERENCES "public"."wbs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."task_progress_history" ADD CONSTRAINT "task_progress_history_wbsProgressHistoryId_fkey" FOREIGN KEY ("wbsProgressHistoryId") REFERENCES "public"."wbs_progress_history"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
