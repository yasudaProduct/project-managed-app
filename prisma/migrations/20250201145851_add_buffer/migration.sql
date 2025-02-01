-- CreateEnum
CREATE TYPE "BufferType" AS ENUM ('RISK', 'OTHER');

-- CreateTable
CREATE TABLE "wbs_buffer" (
    "id" SERIAL NOT NULL,
    "wbsId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "buffer" INTEGER NOT NULL,
    "bufferType" "BufferType" NOT NULL DEFAULT 'OTHER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "wbs_buffer_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "wbs_buffer" ADD CONSTRAINT "wbs_buffer_wbsId_fkey" FOREIGN KEY ("wbsId") REFERENCES "wbs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
