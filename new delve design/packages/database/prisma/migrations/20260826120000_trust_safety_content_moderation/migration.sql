-- CreateEnum
CREATE TYPE "ContentModerationStatus" AS ENUM ('VISIBLE', 'HIDDEN', 'REMOVED');

-- CreateEnum
CREATE TYPE "ContentReportTargetType" AS ENUM ('POST', 'EVENT', 'JOURNEY');

-- CreateEnum
CREATE TYPE "ContentReportReason" AS ENUM ('SPAM', 'SCAM_OR_FRAUD', 'HARASSMENT', 'HATE_OR_ABUSE', 'SEXUAL_CONTENT', 'VIOLENCE_OR_THREATS', 'MISLEADING_INFORMATION', 'ILLEGAL_OR_DANGEROUS', 'PRIVACY', 'IMPERSONATION', 'COMMUNITY_RULE_VIOLATION', 'OTHER');

-- CreateEnum
CREATE TYPE "ContentReportStatus" AS ENUM ('OPEN', 'UNDER_REVIEW', 'RESOLVED', 'DISMISSED');

-- CreateEnum
CREATE TYPE "ContentModerationActionType" AS ENUM ('NO_ACTION', 'HIDE', 'REMOVE', 'RESTORE', 'PLATFORM_RESTRICT');

-- CreateEnum
CREATE TYPE "AdminModerationTargetType" AS ENUM ('POST', 'EVENT', 'JOURNEY', 'COMMUNITY', 'COMMUNITY_THREAD');

-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'CONTENT_REMOVED';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'CONTENT_RESTORED';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'CONTENT_REPORT_REVIEWED';

-- AlterTable
ALTER TABLE "Post" ADD COLUMN "moderationStatus" "ContentModerationStatus" NOT NULL DEFAULT 'VISIBLE';

-- AlterTable
ALTER TABLE "TravelerEvent" ADD COLUMN "moderationStatus" "ContentModerationStatus" NOT NULL DEFAULT 'VISIBLE';

-- AlterTable
ALTER TABLE "Community" ADD COLUMN "moderationStatus" "ContentModerationStatus" NOT NULL DEFAULT 'VISIBLE';

-- AlterTable
ALTER TABLE "Journey" ADD COLUMN "moderationStatus" "ContentModerationStatus" NOT NULL DEFAULT 'VISIBLE';

-- CreateTable
CREATE TABLE "ContentReport" (
    "id" TEXT NOT NULL,
    "reporterId" TEXT NOT NULL,
    "targetType" "ContentReportTargetType" NOT NULL,
    "targetId" TEXT NOT NULL,
    "reason" "ContentReportReason" NOT NULL,
    "details" TEXT,
    "status" "ContentReportStatus" NOT NULL DEFAULT 'OPEN',
    "reviewedAt" TIMESTAMP(3),
    "reviewedByAdminId" TEXT,
    "resolution" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContentReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContentModerationAction" (
    "id" TEXT NOT NULL,
    "targetType" "AdminModerationTargetType" NOT NULL,
    "targetId" TEXT NOT NULL,
    "action" "ContentModerationActionType" NOT NULL,
    "reason" "ContentReportReason",
    "note" TEXT,
    "actorUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContentModerationAction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Post_moderationStatus_idx" ON "Post"("moderationStatus");

-- CreateIndex
CREATE INDEX "TravelerEvent_moderationStatus_idx" ON "TravelerEvent"("moderationStatus");

-- CreateIndex
CREATE INDEX "Community_moderationStatus_idx" ON "Community"("moderationStatus");

-- CreateIndex
CREATE INDEX "Journey_moderationStatus_idx" ON "Journey"("moderationStatus");

-- CreateIndex
CREATE UNIQUE INDEX "ContentReport_reporterId_targetType_targetId_key" ON "ContentReport"("reporterId", "targetType", "targetId");

-- CreateIndex
CREATE INDEX "ContentReport_status_createdAt_idx" ON "ContentReport"("status", "createdAt");

-- CreateIndex
CREATE INDEX "ContentReport_targetType_targetId_idx" ON "ContentReport"("targetType", "targetId");

-- CreateIndex
CREATE INDEX "ContentReport_reporterId_createdAt_idx" ON "ContentReport"("reporterId", "createdAt");

-- CreateIndex
CREATE INDEX "ContentModerationAction_targetType_targetId_createdAt_idx" ON "ContentModerationAction"("targetType", "targetId", "createdAt");

-- CreateIndex
CREATE INDEX "ContentModerationAction_actorUserId_createdAt_idx" ON "ContentModerationAction"("actorUserId", "createdAt");

-- AddForeignKey
ALTER TABLE "ContentReport" ADD CONSTRAINT "ContentReport_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentReport" ADD CONSTRAINT "ContentReport_reviewedByAdminId_fkey" FOREIGN KEY ("reviewedByAdminId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentModerationAction" ADD CONSTRAINT "ContentModerationAction_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
