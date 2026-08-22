-- Messages Phase 3: journey group chats + shared entity messages

ALTER TYPE "ConversationType" ADD VALUE 'JOURNEY';

CREATE TYPE "DirectMessageKind" AS ENUM ('TEXT', 'JOURNEY', 'DEAL');

ALTER TABLE "Conversation" ADD COLUMN "journeyId" TEXT;

CREATE UNIQUE INDEX "Conversation_journeyId_key" ON "Conversation"("journeyId");

ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_journeyId_fkey" FOREIGN KEY ("journeyId") REFERENCES "Journey"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "DirectMessage" ADD COLUMN "kind" "DirectMessageKind" NOT NULL DEFAULT 'TEXT';
ALTER TABLE "DirectMessage" ADD COLUMN "sharedEntityId" TEXT;
ALTER TABLE "DirectMessage" ALTER COLUMN "body" SET DEFAULT '';
