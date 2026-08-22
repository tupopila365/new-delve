-- Delvers Stories (24h ephemeral slides)
ALTER TYPE "MediaPurpose" ADD VALUE IF NOT EXISTS 'story';

CREATE TABLE IF NOT EXISTS "StorySlide" (
    "id" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "mediaId" TEXT NOT NULL,
    "caption" TEXT NOT NULL DEFAULT '',
    "location" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "StorySlide_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "StorySlide_mediaId_key" ON "StorySlide"("mediaId");
CREATE INDEX IF NOT EXISTS "StorySlide_authorId_expiresAt_idx" ON "StorySlide"("authorId", "expiresAt");
CREATE INDEX IF NOT EXISTS "StorySlide_expiresAt_idx" ON "StorySlide"("expiresAt");
CREATE INDEX IF NOT EXISTS "StorySlide_authorId_createdAt_idx" ON "StorySlide"("authorId", "createdAt");
CREATE INDEX IF NOT EXISTS "StorySlide_deletedAt_idx" ON "StorySlide"("deletedAt");

CREATE TABLE IF NOT EXISTS "StoryView" (
    "id" TEXT NOT NULL,
    "viewerId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "lastViewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StoryView_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "StoryView_viewerId_authorId_key" ON "StoryView"("viewerId", "authorId");
CREATE INDEX IF NOT EXISTS "StoryView_authorId_idx" ON "StoryView"("authorId");
CREATE INDEX IF NOT EXISTS "StoryView_viewerId_idx" ON "StoryView"("viewerId");

DO $$ BEGIN
  ALTER TABLE "StorySlide" ADD CONSTRAINT "StorySlide_authorId_fkey"
    FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "StorySlide" ADD CONSTRAINT "StorySlide_mediaId_fkey"
    FOREIGN KEY ("mediaId") REFERENCES "MediaAsset"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "StoryView" ADD CONSTRAINT "StoryView_viewerId_fkey"
    FOREIGN KEY ("viewerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "StoryView" ADD CONSTRAINT "StoryView_authorId_fkey"
    FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
