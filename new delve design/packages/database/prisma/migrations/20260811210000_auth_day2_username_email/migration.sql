-- Additive Day 2 auth hardening: delivery status, username change, account statuses.
-- Does not drop or reset existing User / token tables.
-- AccountStatus values are created in 20260811200000 (avoid ADD VALUE + use in same txn).

-- New enum for verification email delivery.
DO $$ BEGIN
  CREATE TYPE "EmailDeliveryStatus" AS ENUM ('PENDING', 'SENT', 'FAILED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Username change tracking + lowercase backfill.
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "usernameChangedAt" TIMESTAMP(3);

UPDATE "User"
SET
  username = lower(username),
  "usernameNormalized" = lower("usernameNormalized")
WHERE username <> lower(username)
   OR "usernameNormalized" <> lower("usernameNormalized");

-- Existing unverified users → pending_verification (safe; verified stay active/restricted).
UPDATE "User"
SET "accountStatus" = 'pending_verification'
WHERE "emailVerifiedAt" IS NULL
  AND "accountStatus"::text = 'active';

ALTER TABLE "User" ALTER COLUMN "accountStatus" SET DEFAULT 'pending_verification';

-- Delivery status on verification tokens.
ALTER TABLE "EmailVerificationToken"
  ADD COLUMN IF NOT EXISTS "deliveryStatus" "EmailDeliveryStatus" NOT NULL DEFAULT 'PENDING';

CREATE INDEX IF NOT EXISTS "EmailVerificationToken_userId_createdAt_idx"
  ON "EmailVerificationToken"("userId", "createdAt");

-- Username history / reservation + audit.
CREATE TABLE IF NOT EXISTS "UsernameHistory" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "usernameNormalized" TEXT NOT NULL,
    "releasedAt" TIMESTAMP(3) NOT NULL,
    "reservedUntil" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "UsernameHistory_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "UsernameHistory_userId_idx" ON "UsernameHistory"("userId");
CREATE INDEX IF NOT EXISTS "UsernameHistory_usernameNormalized_idx" ON "UsernameHistory"("usernameNormalized");
CREATE INDEX IF NOT EXISTS "UsernameHistory_reservedUntil_idx" ON "UsernameHistory"("reservedUntil");

DO $$ BEGIN
  ALTER TABLE "UsernameHistory"
    ADD CONSTRAINT "UsernameHistory_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Note: Users without usernames are not expected on this Day 2 schema (username is NOT NULL).
-- If a future legacy row lacked a username, backfill with 'user_' || left(id, 8) then enforce uniqueness before deploy.
