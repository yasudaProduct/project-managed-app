-- Add dependency type (FS/SS/FF/SF) and lag (days) to task_dependencies
ALTER TABLE "task_dependencies" ADD COLUMN "type" TEXT NOT NULL DEFAULT 'FS';
ALTER TABLE "task_dependencies" ADD COLUMN "lag" INTEGER NOT NULL DEFAULT 0;
