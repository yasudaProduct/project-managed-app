-- DropForeignKey
ALTER TABLE "wbs" DROP CONSTRAINT "wbs_projectId_fkey";

-- AddForeignKey
ALTER TABLE "wbs" ADD CONSTRAINT "wbs_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
