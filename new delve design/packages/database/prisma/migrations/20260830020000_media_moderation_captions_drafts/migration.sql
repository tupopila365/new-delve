-- CreateEnum
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'MediaUploadSessionStatus') THEN
        CREATE TYPE "MediaUploadSessionStatus" AS ENUM ('PENDING', 'COMPLETED', 'ABANDONED');
    END IF;
END $$;

-- CreateEnum
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'MediaModerationStatus') THEN
        CREATE TYPE "MediaModerationStatus" AS ENUM ('APPROVED', 'PENDING', 'REJECTED', 'FLAGGED');
    END IF;
END $$;

-- CreateTable
CREATE TABLE IF NOT EXISTS "MediaUploadSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "purpose" "MediaPurpose" NOT NULL,
    "expectedCount" INTEGER NOT NULL DEFAULT 1,
    "status" "MediaUploadSessionStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MediaUploadSession_pkey" PRIMARY KEY ("id")
);

-- AlterTable MediaAsset
ALTER TABLE "MediaAsset" ADD COLUMN IF NOT EXISTS "moderationStatus" "MediaModerationStatus" NOT NULL DEFAULT 'APPROVED';
ALTER TABLE "MediaAsset" ADD COLUMN IF NOT EXISTS "moderationReason" TEXT;
ALTER TABLE "MediaAsset" ADD COLUMN IF NOT EXISTS "captionVttUrl" TEXT;
ALTER TABLE "MediaAsset" ADD COLUMN IF NOT EXISTS "draftId" TEXT;

-- AlterTable MediaUploadIntent
ALTER TABLE "MediaUploadIntent" ADD COLUMN IF NOT EXISTS "draftId" TEXT;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "MediaUploadSession_userId_status_idx" ON "MediaUploadSession"("userId", "status");
CREATE INDEX IF NOT EXISTS "MediaUploadSession_status_createdAt_idx" ON "MediaUploadSession"("status", "createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "MediaAsset_moderationStatus_idx" ON "MediaAsset"("moderationStatus");
CREATE INDEX IF NOT EXISTS "MediaAsset_draftId_idx" ON "MediaAsset"("draftId");
CREATE INDEX IF NOT EXISTS "MediaUploadIntent_draftId_idx" ON "MediaUploadIntent"("draftId");

-- AddForeignKey
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'MediaUploadSession_userId_fkey'
    ) THEN
        ALTER TABLE "MediaUploadSession" ADD CONSTRAINT "MediaUploadSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- AddForeignKey
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'MediaAsset_draftId_fkey'
    ) THEN
        ALTER TABLE "MediaAsset" ADD CONSTRAINT "MediaAsset_draftId_fkey" FOREIGN KEY ("draftId") REFERENCES "MediaUploadSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

-- AddForeignKey
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'MediaUploadIntent_draftId_fkey'
    ) THEN
        ALTER TABLE "MediaUploadIntent" ADD CONSTRAINT "MediaUploadIntent_draftId_fkey" FOREIGN KEY ("draftId") REFERENCES "MediaUploadSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;
