-- CreateEnum
CREATE TYPE "MediaUploadSessionStatus" AS ENUM ('PENDING', 'COMPLETED', 'ABANDONED');

-- CreateEnum
CREATE TYPE "MediaModerationStatus" AS ENUM ('APPROVED', 'PENDING', 'REJECTED', 'FLAGGED');

-- CreateTable
CREATE TABLE "MediaUploadSession" (
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
ALTER TABLE "MediaAsset" ADD COLUMN "moderationStatus" "MediaModerationStatus" NOT NULL DEFAULT 'APPROVED';
ALTER TABLE "MediaAsset" ADD COLUMN "moderationReason" TEXT;
ALTER TABLE "MediaAsset" ADD COLUMN "captionVttUrl" TEXT;
ALTER TABLE "MediaAsset" ADD COLUMN "draftId" TEXT;

-- AlterTable MediaUploadIntent
ALTER TABLE "MediaUploadIntent" ADD COLUMN "draftId" TEXT;

-- CreateIndex
CREATE INDEX "MediaUploadSession_userId_status_idx" ON "MediaUploadSession"("userId", "status");
CREATE INDEX "MediaUploadSession_status_createdAt_idx" ON "MediaUploadSession"("status", "createdAt");

-- CreateIndex
CREATE INDEX "MediaAsset_moderationStatus_idx" ON "MediaAsset"("moderationStatus");
CREATE INDEX "MediaAsset_draftId_idx" ON "MediaAsset"("draftId");
CREATE INDEX "MediaUploadIntent_draftId_idx" ON "MediaUploadIntent"("draftId");

-- AddForeignKey
ALTER TABLE "MediaUploadSession" ADD CONSTRAINT "MediaUploadSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MediaAsset" ADD CONSTRAINT "MediaAsset_draftId_fkey" FOREIGN KEY ("draftId") REFERENCES "MediaUploadSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MediaUploadIntent" ADD CONSTRAINT "MediaUploadIntent_draftId_fkey" FOREIGN KEY ("draftId") REFERENCES "MediaUploadSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;
