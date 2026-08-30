-- CreateTable
DO $$ BEGIN
  CREATE TABLE IF NOT EXISTS "BusinessArea" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT,
    "logoUrl" TEXT,
    "coverUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
EXCEPTION
  WHEN duplicate_table THEN null;
  WHEN others THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "BusinessArea" ADD CONSTRAINT "BusinessArea_pkey" PRIMARY KEY ("id");
EXCEPTION
  WHEN duplicate_object THEN null;
  WHEN others THEN null;
END $$;

-- AlterTable
ALTER TABLE "Listing" ADD COLUMN IF NOT EXISTS "businessAreaId" TEXT;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "BusinessArea_businessId_idx" ON "BusinessArea"("businessId");
CREATE INDEX IF NOT EXISTS "BusinessArea_businessId_category_idx" ON "BusinessArea"("businessId", "category");
CREATE INDEX IF NOT EXISTS "Listing_businessAreaId_idx" ON "Listing"("businessAreaId");

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "BusinessArea" ADD CONSTRAINT "BusinessArea_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
  WHEN others THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "Listing" ADD CONSTRAINT "Listing_businessAreaId_fkey" FOREIGN KEY ("businessAreaId") REFERENCES "BusinessArea"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
  WHEN others THEN null;
END $$;

-- Backfill default BusinessArea for existing Business rows where category is populated
DO $$ BEGIN
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
EXCEPTION
  WHEN others THEN null;
END $$;

-- Link existing Listing records to the default BusinessArea of their parent Business
DO $$ BEGIN
  UPDATE "Listing" l
  SET "businessAreaId" = 'bizarea_' || l."businessId"
  WHERE l."businessAreaId" IS NULL AND EXISTS (
    SELECT 1 FROM "BusinessArea" ba WHERE ba.id = 'bizarea_' || l."businessId"
  );
EXCEPTION
  WHEN others THEN null;
END $$;
