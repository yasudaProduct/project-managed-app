-- CreateTable
CREATE TABLE "wbs_import_schedules" (
    "wbsId" INTEGER NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT false,
    "cronExpression" TEXT NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Tokyo',
    "syncMode" TEXT NOT NULL DEFAULT 'diff',
    "includeActuals" BOOLEAN NOT NULL DEFAULT false,
    "nextRunAt" TIMESTAMPTZ,
    "lastRunAt" TIMESTAMPTZ,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "wbs_import_schedules_pkey" PRIMARY KEY ("wbsId")
);

-- CreateTable
CREATE TABLE "import_schedule_settings" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "import_schedule_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "wbs_import_schedules_isEnabled_nextRunAt_idx" ON "wbs_import_schedules"("isEnabled", "nextRunAt");

-- AddForeignKey
ALTER TABLE "wbs_import_schedules" ADD CONSTRAINT "wbs_import_schedules_wbsId_fkey" FOREIGN KEY ("wbsId") REFERENCES "wbs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
