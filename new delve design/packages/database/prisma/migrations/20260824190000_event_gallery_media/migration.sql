-- Event gallery media (continuous photos/videos on TravelerEvent)

ALTER TYPE "MediaPurpose" ADD VALUE 'event';

ALTER TABLE "MediaAsset" ADD COLUMN "eventId" TEXT;

CREATE INDEX "MediaAsset_eventId_idx" ON "MediaAsset"("eventId");

ALTER TABLE "MediaAsset" ADD CONSTRAINT "MediaAsset_eventId_fkey"
  FOREIGN KEY ("eventId") REFERENCES "TravelerEvent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "MediaUploadIntent" ADD COLUMN "eventId" TEXT;
