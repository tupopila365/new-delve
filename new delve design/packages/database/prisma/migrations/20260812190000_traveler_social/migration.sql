-- Traveler social foundation: follows, posts, reactions, comments, saves, events, notifications.

CREATE TYPE "ProfileVisibility" AS ENUM ('PUBLIC', 'PRIVATE');
CREATE TYPE "PostVisibility" AS ENUM ('PUBLIC', 'FOLLOWERS', 'PRIVATE');
CREATE TYPE "PostStatus" AS ENUM ('PUBLISHED', 'DELETED');
CREATE TYPE "ReactionType" AS ENUM ('LIKE');
CREATE TYPE "SaveTargetType" AS ENUM ('POST', 'LISTING', 'DEAL', 'EVENT');
CREATE TYPE "EventVisibility" AS ENUM ('PUBLIC', 'FOLLOWERS', 'PRIVATE');
CREATE TYPE "EventStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'CANCELLED', 'COMPLETED');
CREATE TYPE "AttendanceStatus" AS ENUM ('GOING', 'INTERESTED');
CREATE TYPE "NotificationType" AS ENUM ('NEW_FOLLOWER', 'POST_LIKED', 'POST_COMMENTED', 'EVENT_ATTENDANCE', 'EVENT_UPDATED', 'EVENT_CANCELLED');

ALTER TABLE "TravelerProfile"
  ADD COLUMN IF NOT EXISTS "profileVisibility" "ProfileVisibility" NOT NULL DEFAULT 'PUBLIC';

CREATE TABLE "Follow" (
    "id" TEXT NOT NULL,
    "followerId" TEXT NOT NULL,
    "followingId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Follow_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Follow_followerId_followingId_key" ON "Follow"("followerId", "followingId");
CREATE INDEX "Follow_followingId_idx" ON "Follow"("followingId");
CREATE INDEX "Follow_followerId_idx" ON "Follow"("followerId");

ALTER TABLE "Follow" ADD CONSTRAINT "Follow_followerId_fkey" FOREIGN KEY ("followerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Follow" ADD CONSTRAINT "Follow_followingId_fkey" FOREIGN KEY ("followingId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "Post" (
    "id" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "caption" TEXT NOT NULL DEFAULT '',
    "location" TEXT,
    "visibility" "PostVisibility" NOT NULL DEFAULT 'PUBLIC',
    "status" "PostStatus" NOT NULL DEFAULT 'PUBLISHED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    CONSTRAINT "Post_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Post_authorId_createdAt_idx" ON "Post"("authorId", "createdAt");
CREATE INDEX "Post_status_createdAt_idx" ON "Post"("status", "createdAt");
CREATE INDEX "Post_visibility_idx" ON "Post"("visibility");
ALTER TABLE "Post" ADD CONSTRAINT "Post_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "Reaction" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "type" "ReactionType" NOT NULL DEFAULT 'LIKE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Reaction_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Reaction_userId_postId_type_key" ON "Reaction"("userId", "postId", "type");
CREATE INDEX "Reaction_postId_idx" ON "Reaction"("postId");
ALTER TABLE "Reaction" ADD CONSTRAINT "Reaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Reaction" ADD CONSTRAINT "Reaction_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "Comment" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    CONSTRAINT "Comment_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Comment_postId_createdAt_idx" ON "Comment"("postId", "createdAt");
CREATE INDEX "Comment_authorId_idx" ON "Comment"("authorId");
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "Save" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "targetType" "SaveTargetType" NOT NULL,
    "targetId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Save_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Save_userId_targetType_targetId_key" ON "Save"("userId", "targetType", "targetId");
CREATE INDEX "Save_userId_createdAt_idx" ON "Save"("userId", "createdAt");
CREATE INDEX "Save_targetType_targetId_idx" ON "Save"("targetType", "targetId");
ALTER TABLE "Save" ADD CONSTRAINT "Save_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "TravelerEvent" (
    "id" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "coverUrl" TEXT,
    "coverMediaId" TEXT,
    "startAt" TIMESTAMP(3) NOT NULL,
    "endAt" TIMESTAMP(3),
    "timezone" TEXT,
    "locationName" TEXT,
    "city" TEXT,
    "country" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "category" TEXT,
    "visibility" "EventVisibility" NOT NULL DEFAULT 'PUBLIC',
    "status" "EventStatus" NOT NULL DEFAULT 'DRAFT',
    "maxAttendees" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "TravelerEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TravelerEvent_coverMediaId_key" ON "TravelerEvent"("coverMediaId");
CREATE INDEX "TravelerEvent_creatorId_createdAt_idx" ON "TravelerEvent"("creatorId", "createdAt");
CREATE INDEX "TravelerEvent_status_startAt_idx" ON "TravelerEvent"("status", "startAt");
CREATE INDEX "TravelerEvent_visibility_status_idx" ON "TravelerEvent"("visibility", "status");
ALTER TABLE "TravelerEvent" ADD CONSTRAINT "TravelerEvent_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TravelerEvent" ADD CONSTRAINT "TravelerEvent_coverMediaId_fkey" FOREIGN KEY ("coverMediaId") REFERENCES "MediaAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "EventAttendance" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "AttendanceStatus" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "EventAttendance_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "EventAttendance_eventId_userId_key" ON "EventAttendance"("eventId", "userId");
CREATE INDEX "EventAttendance_userId_idx" ON "EventAttendance"("userId");
CREATE INDEX "EventAttendance_eventId_status_idx" ON "EventAttendance"("eventId", "status");
ALTER TABLE "EventAttendance" ADD CONSTRAINT "EventAttendance_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "TravelerEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EventAttendance" ADD CONSTRAINT "EventAttendance_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL DEFAULT '',
    "entityType" TEXT,
    "entityId" TEXT,
    "actorId" TEXT,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Notification_userId_createdAt_idx" ON "Notification"("userId", "createdAt");
CREATE INDEX "Notification_userId_readAt_idx" ON "Notification"("userId", "readAt");
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- MediaAsset.postId FK (column already existed as reserved)
CREATE INDEX IF NOT EXISTS "MediaAsset_postId_idx" ON "MediaAsset"("postId");
DO $$ BEGIN
  ALTER TABLE "MediaAsset"
    ADD CONSTRAINT "MediaAsset_postId_fkey"
    FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
