-- Journeys foundation: itineraries + stops. Extend SaveTargetType.

CREATE TYPE "JourneyVisibility" AS ENUM ('PUBLIC', 'PRIVATE', 'DRAFT');
CREATE TYPE "JourneyPartyType" AS ENUM ('SOLO', 'COUPLE', 'FAMILY', 'GROUP', 'FRIENDS');

ALTER TYPE "SaveTargetType" ADD VALUE IF NOT EXISTS 'JOURNEY';

CREATE TABLE "Journey" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL DEFAULT '',
    "coverUrl" TEXT,
    "startPlace" TEXT NOT NULL,
    "endPlace" TEXT NOT NULL,
    "countries" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "durationDays" INTEGER NOT NULL DEFAULT 1,
    "transportModes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "historicalCost" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'N$',
    "partyType" "JourneyPartyType" NOT NULL DEFAULT 'SOLO',
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "visibility" "JourneyVisibility" NOT NULL DEFAULT 'PUBLIC',
    "takeaway" TEXT NOT NULL DEFAULT '',
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    CONSTRAINT "Journey_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Journey_slug_key" ON "Journey"("slug");
CREATE INDEX "Journey_authorId_createdAt_idx" ON "Journey"("authorId", "createdAt");
CREATE INDEX "Journey_visibility_publishedAt_idx" ON "Journey"("visibility", "publishedAt");
CREATE INDEX "Journey_deletedAt_idx" ON "Journey"("deletedAt");

CREATE TABLE "JourneyStop" (
    "id" TEXT NOT NULL,
    "journeyId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL,
    "place" TEXT NOT NULL,
    "region" TEXT NOT NULL DEFAULT '',
    "arrivalDay" INTEGER NOT NULL DEFAULT 1,
    "durationDays" INTEGER NOT NULL DEFAULT 1,
    "notes" TEXT NOT NULL DEFAULT '',
    "highlights" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "mediaUrls" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "transportModeToNext" TEXT,
    "transportDurationToNext" TEXT,
    "transportNotes" TEXT,
    "historicalCostHint" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "JourneyStop_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "JourneyStop_journeyId_sortOrder_idx" ON "JourneyStop"("journeyId", "sortOrder");

ALTER TABLE "Journey" ADD CONSTRAINT "Journey_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "JourneyStop" ADD CONSTRAINT "JourneyStop_journeyId_fkey" FOREIGN KEY ("journeyId") REFERENCES "Journey"("id") ON DELETE CASCADE ON UPDATE CASCADE;
