-- CreateEnum
CREATE TYPE "public"."ImportJobType" AS ENUM ('WBS', 'GEPPO');

-- CreateEnum
CREATE TYPE "public"."ImportJobStatus" AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateTable
CREATE TABLE "public"."import_jobs" (
    "id" TEXT NOT NULL,
    "type" "public"."ImportJobType" NOT NULL,
    "status" "public"."ImportJobStatus" NOT NULL DEFAULT 'PENDING',
    "targetMonth" TEXT,
    "targetProjectIds" TEXT[],
    "wbsId" INTEGER,
    "options" JSONB NOT NULL,
    "totalRecords" INTEGER NOT NULL DEFAULT 0,
    "processedRecords" INTEGER NOT NULL DEFAULT 0,
    "successCount" INTEGER NOT NULL DEFAULT 0,
    "errorCount" INTEGER NOT NULL DEFAULT 0,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "errorDetails" JSONB,
    "result" JSONB,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "import_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."import_job_progress" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "detail" JSONB,
    "level" TEXT NOT NULL DEFAULT 'info',
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "import_job_progress_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "import_jobs_type_status_idx" ON "public"."import_jobs"("type", "status");

-- CreateIndex
CREATE INDEX "import_jobs_createdBy_createdAt_idx" ON "public"."import_jobs"("createdBy", "createdAt");

-- CreateIndex
CREATE INDEX "import_job_progress_jobId_recordedAt_idx" ON "public"."import_job_progress"("jobId", "recordedAt");

-- AddForeignKey
ALTER TABLE "public"."import_jobs" ADD CONSTRAINT "import_jobs_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."import_jobs" ADD CONSTRAINT "import_jobs_wbsId_fkey" FOREIGN KEY ("wbsId") REFERENCES "public"."wbs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."import_job_progress" ADD CONSTRAINT "import_job_progress_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "public"."import_jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
