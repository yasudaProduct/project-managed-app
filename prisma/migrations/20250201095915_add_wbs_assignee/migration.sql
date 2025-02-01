-- CreateTable
CREATE TABLE "wbs_assignee" (
    "id" SERIAL NOT NULL,
    "wbsId" INTEGER NOT NULL,
    "assigneeId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "wbs_assignee_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "wbs_assignee" ADD CONSTRAINT "wbs_assignee_wbsId_fkey" FOREIGN KEY ("wbsId") REFERENCES "wbs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wbs_assignee" ADD CONSTRAINT "wbs_assignee_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
