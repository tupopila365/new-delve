-- Messages Phase 2: request status + user blocks

CREATE TYPE "ConversationRequestStatus" AS ENUM ('ACCEPTED', 'PENDING', 'DECLINED');

ALTER TABLE "Conversation" ADD COLUMN "initiatedById" TEXT;
ALTER TABLE "Conversation" ADD COLUMN "requestStatus" "ConversationRequestStatus" NOT NULL DEFAULT 'ACCEPTED';

CREATE INDEX "Conversation_requestStatus_lastMessageAt_idx" ON "Conversation"("requestStatus", "lastMessageAt");

CREATE TABLE "UserBlock" (
    "id" TEXT NOT NULL,
    "blockerId" TEXT NOT NULL,
    "blockedId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserBlock_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "UserBlock_blockerId_blockedId_key" ON "UserBlock"("blockerId", "blockedId");
CREATE INDEX "UserBlock_blockedId_idx" ON "UserBlock"("blockedId");

ALTER TABLE "UserBlock" ADD CONSTRAINT "UserBlock_blockerId_fkey" FOREIGN KEY ("blockerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UserBlock" ADD CONSTRAINT "UserBlock_blockedId_fkey" FOREIGN KEY ("blockedId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
