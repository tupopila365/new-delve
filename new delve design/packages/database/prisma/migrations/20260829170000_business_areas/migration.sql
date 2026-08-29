-- CreateTable
CREATE TABLE "BusinessArea" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT,
    "logoUrl" TEXT,
    "coverUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BusinessArea_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "Listing" ADD COLUMN "businessAreaId" TEXT;

-- CreateIndex
CREATE INDEX "BusinessArea_businessId_idx" ON "BusinessArea"("businessId");

-- CreateIndex
CREATE INDEX "BusinessArea_businessId_category_idx" ON "BusinessArea"("businessId", "category");

-- CreateIndex
CREATE INDEX "Listing_businessAreaId_idx" ON "Listing"("businessAreaId");

-- AddForeignKey
ALTER TABLE "BusinessArea" ADD CONSTRAINT "BusinessArea_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Listing" ADD CONSTRAINT "Listing_businessAreaId_fkey" FOREIGN KEY ("businessAreaId") REFERENCES "BusinessArea"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Backfill default BusinessArea for existing Business rows where category is populated
INSERT INTO "BusinessArea" ("id", "businessId", "name", "category", "description", "createdAt", "updatedAt")
SELECT
  'bizarea_' || id,
  id,
  name,
  category,
  NULL,
  NOW(),
  NOW()
FROM "Business"
WHERE category IS NOT NULL AND TRIM(category) <> '';

-- Link existing Listing records to the default BusinessArea of their parent Business
UPDATE "Listing" l
SET "businessAreaId" = 'bizarea_' || l."businessId"
WHERE EXISTS (
  SELECT 1 FROM "BusinessArea" ba WHERE ba.id = 'bizarea_' || l."businessId"
);
