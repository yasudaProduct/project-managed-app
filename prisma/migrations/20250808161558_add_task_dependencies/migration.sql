-- CreateTable
CREATE TABLE "public"."task_dependencies" (
    "id" SERIAL NOT NULL,
    "predecessorTaskId" INTEGER NOT NULL,
    "successorTaskId" INTEGER NOT NULL,
    "wbsId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "task_dependencies_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "task_dependencies_wbsId_idx" ON "public"."task_dependencies"("wbsId");

-- CreateIndex
CREATE UNIQUE INDEX "task_dependencies_predecessorTaskId_successorTaskId_key" ON "public"."task_dependencies"("predecessorTaskId", "successorTaskId");

-- AddForeignKey
ALTER TABLE "public"."task_dependencies" ADD CONSTRAINT "task_dependencies_predecessorTaskId_fkey" FOREIGN KEY ("predecessorTaskId") REFERENCES "public"."wbs_task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."task_dependencies" ADD CONSTRAINT "task_dependencies_successorTaskId_fkey" FOREIGN KEY ("successorTaskId") REFERENCES "public"."wbs_task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."task_dependencies" ADD CONSTRAINT "task_dependencies_wbsId_fkey" FOREIGN KEY ("wbsId") REFERENCES "public"."wbs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
