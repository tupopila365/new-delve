-- Communities: group chat conversations

ALTER TYPE "ConversationType" ADD VALUE 'COMMUNITY';

ALTER TABLE "Conversation" ADD COLUMN "communityId" TEXT;

CREATE UNIQUE INDEX "Conversation_communityId_key" ON "Conversation"("communityId");

ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_communityId_fkey"
  FOREIGN KEY ("communityId") REFERENCES "Community"("id") ON DELETE CASCADE ON UPDATE CASCADE;
