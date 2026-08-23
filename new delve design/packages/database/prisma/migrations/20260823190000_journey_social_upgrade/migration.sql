-- AlterTable
ALTER TABLE "Journey" ADD COLUMN "coverResourceType" TEXT;
ALTER TABLE "Journey" ADD COLUMN "startDate" TIMESTAMP(3);
ALTER TABLE "Journey" ADD COLUMN "endDate" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Post" ADD COLUMN "journeyId" TEXT;

-- CreateIndex
CREATE INDEX "Post_journeyId_idx" ON "Post"("journeyId");

-- AddForeignKey
ALTER TABLE "Post" ADD CONSTRAINT "Post_journeyId_fkey" FOREIGN KEY ("journeyId") REFERENCES "Journey"("id") ON DELETE SET NULL ON UPDATE CASCADE;
