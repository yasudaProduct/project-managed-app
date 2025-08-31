-- CreateEnum
CREATE TYPE "public"."NotificationType" AS ENUM ('TASK_DEADLINE_WARNING', 'TASK_DEADLINE_OVERDUE', 'TASK_MANHOUR_WARNING', 'TASK_MANHOUR_EXCEEDED', 'TASK_ASSIGNED', 'TASK_UPDATED', 'SCHEDULE_DELAY', 'PROJECT_STATUS_CHANGED');

-- CreateEnum
CREATE TYPE "public"."NotificationPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "public"."NotificationChannel" AS ENUM ('PUSH', 'IN_APP', 'EMAIL');

-- CreateTable
CREATE TABLE "public"."notifications" (
    "id" SERIAL NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "public"."NotificationType" NOT NULL,
    "priority" "public"."NotificationPriority" NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "data" JSONB,
    "channels" "public"."NotificationChannel"[],
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "readAt" TIMESTAMP(3),
    "scheduledAt" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."notification_preferences" (
    "id" SERIAL NOT NULL,
    "userId" TEXT NOT NULL,
    "enablePush" BOOLEAN NOT NULL DEFAULT true,
    "enableInApp" BOOLEAN NOT NULL DEFAULT true,
    "enableEmail" BOOLEAN NOT NULL DEFAULT false,
    "taskDeadline" JSONB NOT NULL DEFAULT '{"days": [3, 1, 0]}',
    "manhourThreshold" JSONB NOT NULL DEFAULT '{"percentages": [80, 100, 120]}',
    "scheduleDelay" BOOLEAN NOT NULL DEFAULT true,
    "taskAssignment" BOOLEAN NOT NULL DEFAULT true,
    "projectStatusChange" BOOLEAN NOT NULL DEFAULT true,
    "quietHoursStart" INTEGER,
    "quietHoursEnd" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notification_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."push_subscriptions" (
    "id" SERIAL NOT NULL,
    "userId" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "keys" JSONB NOT NULL,
    "userAgent" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "push_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "notifications_userId_isRead_idx" ON "public"."notifications"("userId", "isRead");

-- CreateIndex
CREATE INDEX "notifications_scheduledAt_idx" ON "public"."notifications"("scheduledAt");

-- CreateIndex
CREATE UNIQUE INDEX "notification_preferences_userId_key" ON "public"."notification_preferences"("userId");

-- CreateIndex
CREATE INDEX "push_subscriptions_userId_isActive_idx" ON "public"."push_subscriptions"("userId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "push_subscriptions_userId_endpoint_key" ON "public"."push_subscriptions"("userId", "endpoint");

-- AddForeignKey
ALTER TABLE "public"."notifications" ADD CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."notification_preferences" ADD CONSTRAINT "notification_preferences_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."push_subscriptions" ADD CONSTRAINT "push_subscriptions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
