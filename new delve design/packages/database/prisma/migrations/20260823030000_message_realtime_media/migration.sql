-- Messages Phase 4: notifications, image attachments

ALTER TYPE "NotificationType" ADD VALUE 'MESSAGE_RECEIVED';
ALTER TYPE "DirectMessageKind" ADD VALUE 'IMAGE';

ALTER TABLE "DirectMessage" ADD COLUMN "mediaId" TEXT;

CREATE UNIQUE INDEX "DirectMessage_mediaId_key" ON "DirectMessage"("mediaId");

ALTER TABLE "DirectMessage" ADD CONSTRAINT "DirectMessage_mediaId_fkey" FOREIGN KEY ("mediaId") REFERENCES "MediaAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;
