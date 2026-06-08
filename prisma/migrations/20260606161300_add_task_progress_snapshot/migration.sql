-- CreateTable
CREATE TABLE "task_progress_snapshot" (
    "id" SERIAL NOT NULL,
    "taskId" INTEGER NOT NULL,
    "wbsId" INTEGER NOT NULL,
    "taskNo" TEXT NOT NULL,
    "snapshotAt" TIMESTAMPTZ NOT NULL,
    "progressRate" DECIMAL(65,30),
    "status" "TaskStatus" NOT NULL,
    "plannedManHours" DECIMAL(65,30) NOT NULL,
    "baseManHours" DECIMAL(65,30) NOT NULL,
    "costPerHour" DECIMAL(65,30) NOT NULL,
    "plannedStart" DATE,
    "plannedEnd" DATE,
    "baseStart" DATE,
    "baseEnd" DATE,
    "actualStart" DATE,
    "actualEnd" DATE,
    "isRemoved" BOOLEAN NOT NULL DEFAULT false,
    "syncLogId" INTEGER NOT NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "task_progress_snapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "task_progress_snapshot_taskId_snapshotAt_idx" ON "task_progress_snapshot"("taskId", "snapshotAt");

-- CreateIndex
CREATE INDEX "task_progress_snapshot_wbsId_snapshotAt_idx" ON "task_progress_snapshot"("wbsId", "snapshotAt");

-- CreateIndex
CREATE INDEX "task_progress_snapshot_syncLogId_idx" ON "task_progress_snapshot"("syncLogId");

-- AddForeignKey
ALTER TABLE "task_progress_snapshot" ADD CONSTRAINT "task_progress_snapshot_syncLogId_fkey" FOREIGN KEY ("syncLogId") REFERENCES "sync_logs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
