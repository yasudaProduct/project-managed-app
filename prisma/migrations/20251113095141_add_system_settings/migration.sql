-- CreateTable
CREATE TABLE "public"."system_settings" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "standardWorkingHours" DOUBLE PRECISION NOT NULL DEFAULT 7.5,
    "defaultUserCostPerHour" DOUBLE PRECISION,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "system_settings_pkey" PRIMARY KEY ("id")
);

-- Insert default settings
INSERT INTO "public"."system_settings" ("id", "standardWorkingHours", "defaultUserCostPerHour", "createdAt", "updatedAt")
VALUES (1, 7.5, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO NOTHING;
