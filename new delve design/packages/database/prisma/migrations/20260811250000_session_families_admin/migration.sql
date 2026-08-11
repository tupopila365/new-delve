-- Session rotation families + admin role/session audience.
-- Additive. Existing sessions keep working (tokenFamilyId backfilled to id).
-- Does not reset staging or production data. Users are not forced to sign in again.

-- User platform role (default traveler)
DO $$ BEGIN
  CREATE TYPE "UserRole" AS ENUM ('traveler', 'admin');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "role" "UserRole" NOT NULL DEFAULT 'traveler';

-- Session family + admin audience
ALTER TABLE "Session" ADD COLUMN IF NOT EXISTS "tokenFamilyId" TEXT;
ALTER TABLE "Session" ADD COLUMN IF NOT EXISTS "isAdminSession" BOOLEAN NOT NULL DEFAULT false;

-- Backfill: each existing session is its own rotation family
UPDATE "Session" SET "tokenFamilyId" = "id" WHERE "tokenFamilyId" IS NULL;

ALTER TABLE "Session" ALTER COLUMN "tokenFamilyId" SET NOT NULL;

CREATE INDEX IF NOT EXISTS "Session_tokenFamilyId_idx" ON "Session"("tokenFamilyId");
CREATE INDEX IF NOT EXISTS "Session_userId_tokenFamilyId_idx" ON "Session"("userId", "tokenFamilyId");
