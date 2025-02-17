-- CreateTable
CREATE TABLE "work_records" (
    "id" SERIAL NOT NULL,
    "userId" TEXT NOT NULL,
    "taskId" TEXT,
    "date" TIMESTAMP(3) NOT NULL,
    "hours_worked" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "work_records_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "work_records" ADD CONSTRAINT "work_records_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_records" ADD CONSTRAINT "work_records_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "wbs_task"("id") ON DELETE SET NULL ON UPDATE CASCADE;
