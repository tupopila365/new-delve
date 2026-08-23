-- CreateEnum
CREATE TYPE "CommunityMemberRole" AS ENUM ('OWNER', 'ADMIN', 'MODERATOR', 'MEMBER');

-- CreateEnum
CREATE TYPE "CommunityThreadStatus" AS ENUM ('DRAFT', 'PENDING', 'PUBLISHED', 'REMOVED');

-- CreateEnum
CREATE TYPE "CommunityReportStatus" AS ENUM ('OPEN', 'REVIEWING', 'RESOLVED', 'DISMISSED');

-- CreateEnum
CREATE TYPE "CommunityInviteStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED', 'EXPIRED');

-- AlterEnum
ALTER TYPE "CommunityMembershipStatus" ADD VALUE 'BANNED';

-- AlterEnum
ALTER TYPE "CommunityThreadKind" ADD VALUE 'POST';
ALTER TYPE "CommunityThreadKind" ADD VALUE 'TIP';
ALTER TYPE "CommunityThreadKind" ADD VALUE 'RECOMMENDATION';
ALTER TYPE "CommunityThreadKind" ADD VALUE 'ANNOUNCEMENT';
ALTER TYPE "CommunityThreadKind" ADD VALUE 'JOURNEY_SHARE';
ALTER TYPE "CommunityThreadKind" ADD VALUE 'EVENT_SHARE';

-- AlterTable
ALTER TABLE "Community" ADD COLUMN "about" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Community" ADD COLUMN "category" TEXT NOT NULL DEFAULT 'OTHER';
ALTER TABLE "Community" ADD COLUMN "city" TEXT;
ALTER TABLE "Community" ADD COLUMN "country" TEXT;
ALTER TABLE "Community" ADD COLUMN "isGlobal" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Community" ADD COLUMN "avatarUrl" TEXT;
ALTER TABLE "Community" ADD COLUMN "ownerUserId" TEXT;
ALTER TABLE "Community" ADD COLUMN "requireJoinApproval" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Community" ADD COLUMN "requireRuleAcknowledgement" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Community" ADD COLUMN "requirePostApproval" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Community" ADD COLUMN "postingPermission" TEXT NOT NULL DEFAULT 'MEMBERS';

-- AlterTable
ALTER TABLE "CommunityMembership" ADD COLUMN "role" "CommunityMemberRole" NOT NULL DEFAULT 'MEMBER';
ALTER TABLE "CommunityMembership" ADD COLUMN "mutedUntil" TIMESTAMP(3);
ALTER TABLE "CommunityMembership" ADD COLUMN "banReason" TEXT;

-- AlterTable
ALTER TABLE "CommunityThread" ADD COLUMN "status" "CommunityThreadStatus" NOT NULL DEFAULT 'PUBLISHED';
ALTER TABLE "CommunityThread" ADD COLUMN "locationName" TEXT;
ALTER TABLE "CommunityThread" ADD COLUMN "mediaUrls" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "CommunityThread" ADD COLUMN "journeyId" TEXT;
ALTER TABLE "CommunityThread" ADD COLUMN "eventId" TEXT;
ALTER TABLE "CommunityThread" ADD COLUMN "listingId" TEXT;
ALTER TABLE "CommunityThread" ADD COLUMN "answered" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "CommunityRule" (
    "id" TEXT NOT NULL,
    "communityId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CommunityRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommunityReport" (
    "id" TEXT NOT NULL,
    "communityId" TEXT NOT NULL,
    "reporterId" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "ruleId" TEXT,
    "reason" TEXT NOT NULL,
    "description" TEXT,
    "status" "CommunityReportStatus" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CommunityReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommunityInvite" (
    "id" TEXT NOT NULL,
    "communityId" TEXT NOT NULL,
    "invitedUserId" TEXT NOT NULL,
    "invitedById" TEXT NOT NULL,
    "status" "CommunityInviteStatus" NOT NULL DEFAULT 'PENDING',
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CommunityInvite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommunityAuditLog" (
    "id" TEXT NOT NULL,
    "communityId" TEXT NOT NULL,
    "actorId" TEXT,
    "action" TEXT NOT NULL,
    "targetType" TEXT,
    "targetId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommunityAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Community_category_city_country_idx" ON "Community"("category", "city", "country");
CREATE INDEX "Community_ownerUserId_idx" ON "Community"("ownerUserId");

-- CreateIndex
CREATE INDEX "CommunityMembership_communityId_role_idx" ON "CommunityMembership"("communityId", "role");

-- CreateIndex
CREATE INDEX "CommunityThread_communityId_status_pinned_createdAt_idx" ON "CommunityThread"("communityId", "status", "pinned", "createdAt");

-- CreateIndex
CREATE INDEX "CommunityRule_communityId_sortOrder_idx" ON "CommunityRule"("communityId", "sortOrder");

-- CreateIndex
CREATE INDEX "CommunityReport_communityId_status_createdAt_idx" ON "CommunityReport"("communityId", "status", "createdAt");
CREATE INDEX "CommunityReport_targetType_targetId_idx" ON "CommunityReport"("targetType", "targetId");

-- CreateIndex
CREATE INDEX "CommunityInvite_invitedUserId_status_idx" ON "CommunityInvite"("invitedUserId", "status");
CREATE UNIQUE INDEX "CommunityInvite_communityId_invitedUserId_key" ON "CommunityInvite"("communityId", "invitedUserId");

-- CreateIndex
CREATE INDEX "CommunityAuditLog_communityId_createdAt_idx" ON "CommunityAuditLog"("communityId", "createdAt");

-- AddForeignKey
ALTER TABLE "Community" ADD CONSTRAINT "Community_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityRule" ADD CONSTRAINT "CommunityRule_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "Community"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityReport" ADD CONSTRAINT "CommunityReport_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "Community"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CommunityReport" ADD CONSTRAINT "CommunityReport_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CommunityReport" ADD CONSTRAINT "CommunityReport_ruleId_fkey" FOREIGN KEY ("ruleId") REFERENCES "CommunityRule"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityInvite" ADD CONSTRAINT "CommunityInvite_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "Community"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CommunityInvite" ADD CONSTRAINT "CommunityInvite_invitedUserId_fkey" FOREIGN KEY ("invitedUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CommunityInvite" ADD CONSTRAINT "CommunityInvite_invitedById_fkey" FOREIGN KEY ("invitedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityAuditLog" ADD CONSTRAINT "CommunityAuditLog_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "Community"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CommunityAuditLog" ADD CONSTRAINT "CommunityAuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityThread" ADD CONSTRAINT "CommunityThread_journeyId_fkey" FOREIGN KEY ("journeyId") REFERENCES "Journey"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CommunityThread" ADD CONSTRAINT "CommunityThread_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "TravelerEvent"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CommunityThread" ADD CONSTRAINT "CommunityThread_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Migrate legacy MODERATOR membership status to role
UPDATE "CommunityMembership" SET "role" = 'MODERATOR' WHERE "status" = 'MODERATOR';
UPDATE "CommunityMembership" SET "status" = 'JOINED' WHERE "status" = 'MODERATOR';
