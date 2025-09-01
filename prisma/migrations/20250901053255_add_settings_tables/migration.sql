-- CreateTable
CREATE TABLE "public"."global_settings" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "dailyWorkingHours" DOUBLE PRECISION NOT NULL DEFAULT 7.5,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "global_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."project_settings" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "dailyWorkingHours" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "project_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "project_settings_projectId_key" ON "public"."project_settings"("projectId");

-- AddForeignKey
ALTER TABLE "public"."project_settings" ADD CONSTRAINT "project_settings_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "public"."projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
