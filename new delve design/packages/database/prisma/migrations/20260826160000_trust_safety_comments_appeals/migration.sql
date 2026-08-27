-- AlterEnum
ALTER TYPE "ContentReportTargetType" ADD VALUE IF NOT EXISTS 'POST_COMMENT';

-- AlterEnum
ALTER TYPE "AdminModerationTargetType" ADD VALUE IF NOT EXISTS 'POST_COMMENT';
ALTER TYPE "AdminModerationTargetType" ADD VALUE IF NOT EXISTS 'COMMUNITY_COMMENT';

-- CreateEnum
CREATE TYPE "ContentAppealStatus" AS ENUM ('OPEN', 'UNDER_REVIEW', 'UPHELD', 'OVERTURNED', 'WITHDRAWN');

-- AlterTable Comment
ALTER TABLE "Comment" ADD COLUMN "moderationStatus" "ContentModerationStatus" NOT NULL DEFAULT 'VISIBLE';
CREATE INDEX "Comment_moderationStatus_idx" ON "Comment"("moderationStatus");

-- AlterTable CommunityAnswer
ALTER TABLE "CommunityAnswer" ADD COLUMN "moderationStatus" "ContentModerationStatus" NOT NULL DEFAULT 'VISIBLE';
CREATE INDEX "CommunityAnswer_moderationStatus_idx" ON "CommunityAnswer"("moderationStatus");

-- ContentReport: snapshot + drop lifetime unique so closed episodes can be re-reported
ALTER TABLE "ContentReport" ADD COLUMN "reportedTextSnapshot" TEXT;
DROP INDEX IF EXISTS "ContentReport_reporterId_targetType_targetId_key";
CREATE INDEX "ContentReport_reporterId_targetType_targetId_status_idx" ON "ContentReport"("reporterId", "targetType", "targetId", "status");
CREATE UNIQUE INDEX "ContentReport_open_reporter_target_key"
  ON "ContentReport"("reporterId", "targetType", "targetId")
  WHERE "status" IN ('OPEN', 'UNDER_REVIEW');

-- CreateTable ContentAppeal
CREATE TABLE "ContentAppeal" (
    "id" TEXT NOT NULL,
    "moderationActionId" TEXT NOT NULL,
    "appellantUserId" TEXT NOT NULL,
    "targetType" "AdminModerationTargetType" NOT NULL,
    "targetId" TEXT NOT NULL,
    "statement" TEXT,
    "status" "ContentAppealStatus" NOT NULL DEFAULT 'OPEN',
    "reviewedAt" TIMESTAMP(3),
    "reviewedByAdminId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContentAppeal_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ContentAppeal_moderationActionId_idx" ON "ContentAppeal"("moderationActionId");
CREATE INDEX "ContentAppeal_targetType_targetId_idx" ON "ContentAppeal"("targetType", "targetId");
CREATE INDEX "ContentAppeal_appellantUserId_createdAt_idx" ON "ContentAppeal"("appellantUserId", "createdAt");

ALTER TABLE "ContentAppeal" ADD CONSTRAINT "ContentAppeal_moderationActionId_fkey" FOREIGN KEY ("moderationActionId") REFERENCES "ContentModerationAction"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ContentAppeal" ADD CONSTRAINT "ContentAppeal_appellantUserId_fkey" FOREIGN KEY ("appellantUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
