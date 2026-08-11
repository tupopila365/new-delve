-- Session management: rename RefreshToken → Session, enrich device/location fields.
-- Additive / rename-safe. Does not reset staging data.

-- Rename table and primary key
ALTER TABLE "RefreshToken" RENAME TO "Session";
ALTER TABLE "Session" RENAME CONSTRAINT "RefreshToken_pkey" TO "Session_pkey";

-- Rename FK
ALTER TABLE "Session" RENAME CONSTRAINT "RefreshToken_userId_fkey" TO "Session_userId_fkey";

-- Rename indexes
ALTER INDEX "RefreshToken_tokenHash_key" RENAME TO "Session_tokenHash_key";
ALTER INDEX "RefreshToken_userId_idx" RENAME TO "Session_userId_idx";
ALTER INDEX "RefreshToken_expiresAt_idx" RENAME TO "Session_expiresAt_idx";

-- lastUsedAt → lastSeenAt
DO $$ BEGIN
  ALTER TABLE "Session" RENAME COLUMN "lastUsedAt" TO "lastSeenAt";
EXCEPTION
  WHEN undefined_column THEN null;
END $$;

-- Drop raw UA / full IP (privacy). Parsed fields replace them.
ALTER TABLE "Session" DROP COLUMN IF EXISTS "userAgent";
ALTER TABLE "Session" DROP COLUMN IF EXISTS "ip";

ALTER TABLE "Session" ADD COLUMN IF NOT EXISTS "revokedReason" TEXT;
ALTER TABLE "Session" ADD COLUMN IF NOT EXISTS "browserName" TEXT;
ALTER TABLE "Session" ADD COLUMN IF NOT EXISTS "browserMajorVersion" INTEGER;
ALTER TABLE "Session" ADD COLUMN IF NOT EXISTS "operatingSystem" TEXT;
ALTER TABLE "Session" ADD COLUMN IF NOT EXISTS "deviceType" TEXT;
ALTER TABLE "Session" ADD COLUMN IF NOT EXISTS "deviceLabel" TEXT;
ALTER TABLE "Session" ADD COLUMN IF NOT EXISTS "approxCity" TEXT;
ALTER TABLE "Session" ADD COLUMN IF NOT EXISTS "approxRegion" TEXT;
ALTER TABLE "Session" ADD COLUMN IF NOT EXISTS "approxCountryCode" TEXT;

CREATE INDEX IF NOT EXISTS "Session_revokedAt_idx" ON "Session"("revokedAt");
CREATE INDEX IF NOT EXISTS "Session_lastSeenAt_idx" ON "Session"("lastSeenAt");
CREATE INDEX IF NOT EXISTS "Session_userId_revokedAt_expiresAt_idx" ON "Session"("userId", "revokedAt", "expiresAt");

-- Password reset tokens (hashed only)
CREATE TABLE IF NOT EXISTS "PasswordResetToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "PasswordResetToken_tokenHash_key" ON "PasswordResetToken"("tokenHash");
CREATE INDEX IF NOT EXISTS "PasswordResetToken_userId_idx" ON "PasswordResetToken"("userId");
CREATE INDEX IF NOT EXISTS "PasswordResetToken_expiresAt_idx" ON "PasswordResetToken"("expiresAt");

DO $$ BEGIN
  ALTER TABLE "PasswordResetToken"
    ADD CONSTRAINT "PasswordResetToken_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE INDEX IF NOT EXISTS "SecurityEvent_createdAt_idx" ON "SecurityEvent"("createdAt");
