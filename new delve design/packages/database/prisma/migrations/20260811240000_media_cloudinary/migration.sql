-- Additive media architecture: Cloudinary metadata only (no binary columns).
-- Does not reset staging data. Legacy TravelerProfile.avatarUrl/avatarKey retained for migration.

DO $$ BEGIN
  CREATE TYPE "MediaStatus" AS ENUM ('PENDING', 'UPLOADING', 'PROCESSING', 'READY', 'FAILED', 'DELETION_PENDING', 'DELETED');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "MediaPurpose" AS ENUM ('avatar', 'post', 'review', 'business_profile', 'listing', 'message');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "MediaResourceType" AS ENUM ('image', 'video', 'raw', 'auto');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "MediaUploadIntentStatus" AS ENUM ('PENDING', 'COMPLETED', 'EXPIRED', 'FAILED', 'CANCELLED');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "MediaUploadIntent" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "purpose" "MediaPurpose" NOT NULL,
    "expectedResourceType" "MediaResourceType" NOT NULL,
    "maxBytes" INTEGER NOT NULL,
    "permittedFormats" TEXT[] NOT NULL,
    "folder" TEXT NOT NULL,
    "businessId" TEXT,
    "listingId" TEXT,
    "originalFilename" TEXT,
    "reportedMimeType" TEXT,
    "reportedBytes" INTEGER,
    "status" "MediaUploadIntentStatus" NOT NULL DEFAULT 'PENDING',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MediaUploadIntent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "MediaUploadIntent_userId_status_idx" ON "MediaUploadIntent"("userId", "status");
CREATE INDEX IF NOT EXISTS "MediaUploadIntent_expiresAt_idx" ON "MediaUploadIntent"("expiresAt");
CREATE INDEX IF NOT EXISTS "MediaUploadIntent_status_createdAt_idx" ON "MediaUploadIntent"("status", "createdAt");

DO $$ BEGIN
  ALTER TABLE "MediaUploadIntent"
    ADD CONSTRAINT "MediaUploadIntent_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "MediaAsset" (
    "id" TEXT NOT NULL,
    "cloudinaryAssetId" TEXT,
    "publicId" TEXT NOT NULL,
    "version" INTEGER,
    "resourceType" "MediaResourceType" NOT NULL,
    "deliveryType" TEXT NOT NULL DEFAULT 'upload',
    "format" TEXT,
    "bytes" INTEGER,
    "width" INTEGER,
    "height" INTEGER,
    "duration" DOUBLE PRECISION,
    "secureUrl" TEXT,
    "status" "MediaStatus" NOT NULL DEFAULT 'PENDING',
    "purpose" "MediaPurpose" NOT NULL,
    "altText" TEXT,
    "uploadedByUserId" TEXT NOT NULL,
    "businessId" TEXT,
    "listingId" TEXT,
    "postId" TEXT,
    "uploadIntentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "sortOrder" INTEGER,
    CONSTRAINT "MediaAsset_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "MediaAsset_cloudinaryAssetId_key" ON "MediaAsset"("cloudinaryAssetId");
CREATE UNIQUE INDEX IF NOT EXISTS "MediaAsset_publicId_key" ON "MediaAsset"("publicId");
CREATE UNIQUE INDEX IF NOT EXISTS "MediaAsset_uploadIntentId_key" ON "MediaAsset"("uploadIntentId");
CREATE INDEX IF NOT EXISTS "MediaAsset_uploadedByUserId_purpose_status_idx" ON "MediaAsset"("uploadedByUserId", "purpose", "status");
CREATE INDEX IF NOT EXISTS "MediaAsset_status_idx" ON "MediaAsset"("status");
CREATE INDEX IF NOT EXISTS "MediaAsset_purpose_idx" ON "MediaAsset"("purpose");
CREATE INDEX IF NOT EXISTS "MediaAsset_createdAt_idx" ON "MediaAsset"("createdAt");
CREATE INDEX IF NOT EXISTS "MediaAsset_businessId_idx" ON "MediaAsset"("businessId");
CREATE INDEX IF NOT EXISTS "MediaAsset_listingId_idx" ON "MediaAsset"("listingId");
CREATE INDEX IF NOT EXISTS "MediaAsset_deletedAt_idx" ON "MediaAsset"("deletedAt");

DO $$ BEGIN
  ALTER TABLE "MediaAsset"
    ADD CONSTRAINT "MediaAsset_uploadedByUserId_fkey"
    FOREIGN KEY ("uploadedByUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "MediaAsset"
    ADD CONSTRAINT "MediaAsset_uploadIntentId_fkey"
    FOREIGN KEY ("uploadIntentId") REFERENCES "MediaUploadIntent"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

ALTER TABLE "TravelerProfile" ADD COLUMN IF NOT EXISTS "avatarMediaId" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "TravelerProfile_avatarMediaId_key" ON "TravelerProfile"("avatarMediaId");

DO $$ BEGIN
  ALTER TABLE "TravelerProfile"
    ADD CONSTRAINT "TravelerProfile_avatarMediaId_fkey"
    FOREIGN KEY ("avatarMediaId") REFERENCES "MediaAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
