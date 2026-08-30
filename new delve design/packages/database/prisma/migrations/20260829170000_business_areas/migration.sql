-- CreateTable
CREATE TABLE IF NOT EXISTS "BusinessArea" (
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
ALTER TABLE "Listing" ADD COLUMN IF NOT EXISTS "businessAreaId" TEXT;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "BusinessArea_businessId_idx" ON "BusinessArea"("businessId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "BusinessArea_businessId_category_idx" ON "BusinessArea"("businessId", "category");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Listing_businessAreaId_idx" ON "Listing"("businessAreaId");

-- AddForeignKey
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'BusinessArea_businessId_fkey'
    ) THEN
        ALTER TABLE "BusinessArea" ADD CONSTRAINT "BusinessArea_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- AddForeignKey
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'Listing_businessAreaId_fkey'
    ) THEN
        ALTER TABLE "Listing" ADD CONSTRAINT "Listing_businessAreaId_fkey" FOREIGN KEY ("businessAreaId") REFERENCES "BusinessArea"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

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
WHERE category IS NOT NULL AND TRIM(category) <> ''
ON CONFLICT ("id") DO NOTHING;

-- Link existing Listing records to the default BusinessArea of their parent Business
UPDATE "Listing" l
SET "businessAreaId" = 'bizarea_' || l."businessId"
WHERE l."businessAreaId" IS NULL AND EXISTS (
  SELECT 1 FROM "BusinessArea" ba WHERE ba.id = 'bizarea_' || l."businessId"
);
