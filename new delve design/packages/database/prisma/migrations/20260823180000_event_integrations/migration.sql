-- AlterTable
ALTER TABLE "Post" ADD COLUMN "eventId" TEXT;

-- AlterTable
ALTER TABLE "TravelerEvent" ADD COLUMN "communityId" TEXT;
ALTER TABLE "TravelerEvent" ADD COLUMN "businessId" TEXT;

-- CreateTable
CREATE TABLE "JourneyEvent" (
    "id" TEXT NOT NULL,
    "journeyId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "addedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JourneyEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Post_eventId_idx" ON "Post"("eventId");

-- CreateIndex
CREATE INDEX "TravelerEvent_communityId_idx" ON "TravelerEvent"("communityId");

-- CreateIndex
CREATE INDEX "TravelerEvent_businessId_idx" ON "TravelerEvent"("businessId");

-- CreateIndex
CREATE UNIQUE INDEX "JourneyEvent_journeyId_eventId_key" ON "JourneyEvent"("journeyId", "eventId");

-- CreateIndex
CREATE INDEX "JourneyEvent_eventId_idx" ON "JourneyEvent"("eventId");

-- CreateIndex
CREATE INDEX "JourneyEvent_addedById_idx" ON "JourneyEvent"("addedById");

-- AddForeignKey
ALTER TABLE "Post" ADD CONSTRAINT "Post_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "TravelerEvent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TravelerEvent" ADD CONSTRAINT "TravelerEvent_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "Community"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TravelerEvent" ADD CONSTRAINT "TravelerEvent_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JourneyEvent" ADD CONSTRAINT "JourneyEvent_journeyId_fkey" FOREIGN KEY ("journeyId") REFERENCES "Journey"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JourneyEvent" ADD CONSTRAINT "JourneyEvent_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "TravelerEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JourneyEvent" ADD CONSTRAINT "JourneyEvent_addedById_fkey" FOREIGN KEY ("addedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
