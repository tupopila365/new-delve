-- Community threads (questions / discussions) + answers. Extend SaveTargetType.

CREATE TYPE "CommunityThreadKind" AS ENUM ('QUESTION', 'DISCUSSION');

ALTER TYPE "SaveTargetType" ADD VALUE IF NOT EXISTS 'COMMUNITY_THREAD';

CREATE TABLE "CommunityThread" (
    "id" TEXT NOT NULL,
    "communityId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "kind" "CommunityThreadKind" NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL DEFAULT '',
    "topic" TEXT,
    "pinned" BOOLEAN NOT NULL DEFAULT false,
    "official" BOOLEAN NOT NULL DEFAULT false,
    "acceptedAnswerId" TEXT,
    "answerCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    CONSTRAINT "CommunityThread_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CommunityThread_acceptedAnswerId_key" ON "CommunityThread"("acceptedAnswerId");
CREATE INDEX "CommunityThread_communityId_kind_createdAt_idx" ON "CommunityThread"("communityId", "kind", "createdAt");
CREATE INDEX "CommunityThread_kind_createdAt_idx" ON "CommunityThread"("kind", "createdAt");
CREATE INDEX "CommunityThread_authorId_createdAt_idx" ON "CommunityThread"("authorId", "createdAt");
CREATE INDEX "CommunityThread_deletedAt_idx" ON "CommunityThread"("deletedAt");

CREATE TABLE "CommunityAnswer" (
    "id" TEXT NOT NULL,
    "threadId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "helpfulCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    CONSTRAINT "CommunityAnswer_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CommunityAnswer_threadId_createdAt_idx" ON "CommunityAnswer"("threadId", "createdAt");
CREATE INDEX "CommunityAnswer_authorId_idx" ON "CommunityAnswer"("authorId");
CREATE INDEX "CommunityAnswer_deletedAt_idx" ON "CommunityAnswer"("deletedAt");

ALTER TABLE "CommunityThread" ADD CONSTRAINT "CommunityThread_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "Community"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CommunityThread" ADD CONSTRAINT "CommunityThread_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CommunityAnswer" ADD CONSTRAINT "CommunityAnswer_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "CommunityThread"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CommunityAnswer" ADD CONSTRAINT "CommunityAnswer_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Accepted answer FK after both tables exist
ALTER TABLE "CommunityThread" ADD CONSTRAINT "CommunityThread_acceptedAnswerId_fkey" FOREIGN KEY ("acceptedAnswerId") REFERENCES "CommunityAnswer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
