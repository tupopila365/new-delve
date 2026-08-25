-- Event likes (social feed)

ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'EVENT_LIKED';

CREATE TABLE "EventReaction" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EventReaction_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "EventReaction_eventId_idx" ON "EventReaction"("eventId");
CREATE UNIQUE INDEX "EventReaction_userId_eventId_key" ON "EventReaction"("userId", "eventId");

ALTER TABLE "EventReaction" ADD CONSTRAINT "EventReaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EventReaction" ADD CONSTRAINT "EventReaction_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "TravelerEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;
