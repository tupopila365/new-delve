-- Traveler profile cover photo (Cloudinary URL + media metadata only).
-- Enum ADD VALUE is committed in this migration; no row uses 'cover' here (safe for Postgres).

ALTER TYPE "MediaPurpose" ADD VALUE IF NOT EXISTS 'cover';

ALTER TABLE "TravelerProfile" ADD COLUMN IF NOT EXISTS "coverUrl" TEXT;
ALTER TABLE "TravelerProfile" ADD COLUMN IF NOT EXISTS "coverMediaId" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "TravelerProfile_coverMediaId_key" ON "TravelerProfile"("coverMediaId");

DO $$ BEGIN
  ALTER TABLE "TravelerProfile"
    ADD CONSTRAINT "TravelerProfile_coverMediaId_fkey"
    FOREIGN KEY ("coverMediaId") REFERENCES "MediaAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
