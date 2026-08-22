-- Journey comments and likes (Phase 5)

CREATE TABLE "JourneyComment" (
    "id" TEXT NOT NULL,
    "journeyId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "JourneyComment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "JourneyReaction" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "journeyId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JourneyReaction_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "JourneyComment_journeyId_createdAt_idx" ON "JourneyComment"("journeyId", "createdAt");
CREATE INDEX "JourneyComment_authorId_idx" ON "JourneyComment"("authorId");
CREATE INDEX "JourneyReaction_journeyId_idx" ON "JourneyReaction"("journeyId");
CREATE UNIQUE INDEX "JourneyReaction_userId_journeyId_key" ON "JourneyReaction"("userId", "journeyId");

ALTER TABLE "JourneyComment" ADD CONSTRAINT "JourneyComment_journeyId_fkey" FOREIGN KEY ("journeyId") REFERENCES "Journey"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "JourneyComment" ADD CONSTRAINT "JourneyComment_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "JourneyReaction" ADD CONSTRAINT "JourneyReaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "JourneyReaction" ADD CONSTRAINT "JourneyReaction_journeyId_fkey" FOREIGN KEY ("journeyId") REFERENCES "Journey"("id") ON DELETE CASCADE ON UPDATE CASCADE;
