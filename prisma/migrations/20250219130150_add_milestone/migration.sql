-- CreateTable
CREATE TABLE "milestone" (
    "id" SERIAL NOT NULL,
    "wbsId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "milestone_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "milestone" ADD CONSTRAINT "milestone_wbsId_fkey" FOREIGN KEY ("wbsId") REFERENCES "wbs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
