-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED');

-- CreateTable
CREATE TABLE "wbs" (
    "id" SERIAL NOT NULL,
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "wbs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wbs_phase" (
    "id" SERIAL NOT NULL,
    "wbsId" INTEGER NOT NULL,
    "seq" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "wbs_phase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "phase_template" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "phase_template_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wbs_task" (
    "id" TEXT NOT NULL,
    "wbsId" INTEGER NOT NULL,
    "phaseId" INTEGER,
    "name" TEXT NOT NULL,
    "assigneeId" TEXT,
    "kijunStartDate" TIMESTAMP(3),
    "kijunEndDate" TIMESTAMP(3),
    "kijunKosu" INTEGER,
    "yoteiStartDate" TIMESTAMP(3),
    "yoteiEndDate" TIMESTAMP(3),
    "yoteiKosu" INTEGER,
    "jissekiStartDate" TIMESTAMP(3),
    "jissekiEndDate" TIMESTAMP(3),
    "jissekiKosu" INTEGER,
    "status" "TaskStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "wbs_task_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "task_status_log" (
    "id" SERIAL NOT NULL,
    "taskId" TEXT NOT NULL,
    "status" "TaskStatus" NOT NULL,
    "changedAt" TIMESTAMP(3) NOT NULL,
    "changedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "task_status_log_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "phase_template_name_key" ON "phase_template"("name");

-- AddForeignKey
ALTER TABLE "wbs" ADD CONSTRAINT "wbs_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wbs_phase" ADD CONSTRAINT "wbs_phase_wbsId_fkey" FOREIGN KEY ("wbsId") REFERENCES "wbs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wbs_task" ADD CONSTRAINT "wbs_task_wbsId_fkey" FOREIGN KEY ("wbsId") REFERENCES "wbs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wbs_task" ADD CONSTRAINT "wbs_task_phaseId_fkey" FOREIGN KEY ("phaseId") REFERENCES "wbs_phase"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wbs_task" ADD CONSTRAINT "wbs_task_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_status_log" ADD CONSTRAINT "task_status_log_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "wbs_task"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_status_log" ADD CONSTRAINT "task_status_log_changedBy_fkey" FOREIGN KEY ("changedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
