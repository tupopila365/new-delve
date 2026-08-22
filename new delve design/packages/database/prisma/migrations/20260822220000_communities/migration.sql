-- Communities foundation: hubs + memberships (list / discover / join).

CREATE TYPE "CommunityType" AS ENUM ('DESTINATION', 'INTEREST', 'TRANSPORT', 'OFFICIAL');
CREATE TYPE "CommunityPrivacy" AS ENUM ('PUBLIC', 'PRIVATE');
CREATE TYPE "CommunityMembershipStatus" AS ENUM ('JOINED', 'REQUESTED', 'MODERATOR');

CREATE TABLE "Community" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "communityType" "CommunityType" NOT NULL,
    "destination" TEXT NOT NULL,
    "topics" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "coverUrl" TEXT,
    "privacy" "CommunityPrivacy" NOT NULL DEFAULT 'PUBLIC',
    "official" BOOLEAN NOT NULL DEFAULT false,
    "businessManaged" BOOLEAN NOT NULL DEFAULT false,
    "memberCount" INTEGER NOT NULL DEFAULT 0,
    "lastActivityAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    CONSTRAINT "Community_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Community_slug_key" ON "Community"("slug");
CREATE INDEX "Community_communityType_destination_idx" ON "Community"("communityType", "destination");
CREATE INDEX "Community_lastActivityAt_idx" ON "Community"("lastActivityAt");
CREATE INDEX "Community_deletedAt_idx" ON "Community"("deletedAt");

CREATE TABLE "CommunityMembership" (
    "id" TEXT NOT NULL,
    "communityId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "CommunityMembershipStatus" NOT NULL DEFAULT 'JOINED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CommunityMembership_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CommunityMembership_communityId_userId_key" ON "CommunityMembership"("communityId", "userId");
CREATE INDEX "CommunityMembership_userId_createdAt_idx" ON "CommunityMembership"("userId", "createdAt");
CREATE INDEX "CommunityMembership_communityId_status_idx" ON "CommunityMembership"("communityId", "status");

ALTER TABLE "CommunityMembership" ADD CONSTRAINT "CommunityMembership_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "Community"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CommunityMembership" ADD CONSTRAINT "CommunityMembership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
