-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'COMMUNITY_POST_APPROVED';

-- CreateTable
CREATE TABLE "CommunityThreadReaction" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "threadId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommunityThreadReaction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CommunityThreadReaction_userId_threadId_key" ON "CommunityThreadReaction"("userId", "threadId");
CREATE INDEX "CommunityThreadReaction_threadId_idx" ON "CommunityThreadReaction"("threadId");

-- AddForeignKey
ALTER TABLE "CommunityThreadReaction" ADD CONSTRAINT "CommunityThreadReaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CommunityThreadReaction" ADD CONSTRAINT "CommunityThreadReaction_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "CommunityThread"("id") ON DELETE CASCADE ON UPDATE CASCADE;
