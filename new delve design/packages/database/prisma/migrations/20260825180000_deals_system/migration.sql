-- Deals system: extra Deal fields, JourneyDeal, claims, reports, analytics, media/notify enums.

ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'DEAL_CLAIMED';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'DEAL_CLAIM_UPDATED';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'DEAL_APPROVED';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'DEAL_REJECTED';

ALTER TYPE "MediaPurpose" ADD VALUE IF NOT EXISTS 'deal';

DO $$ BEGIN CREATE TYPE "DealClaimMethod" AS ENUM ('IN_APP', 'SHOW_CODE', 'BOOKING_CODE', 'LINK'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "DealClaimStatus" AS ENUM ('PENDING', 'CONFIRMED', 'REDEEMED', 'CANCELLED', 'EXPIRED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "DealReportReason" AS ENUM ('SPAM', 'MISLEADING', 'INAPPROPRIATE', 'SCAM', 'OTHER'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "DealReportStatus" AS ENUM ('OPEN', 'REVIEWED', 'DISMISSED', 'ACTIONED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "DealAnalyticsKind" AS ENUM ('IMPRESSION', 'CLICK', 'CLAIM', 'SAVE', 'JOURNEY_ADD'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE "Deal"
  ADD COLUMN IF NOT EXISTS "coverMediaId" TEXT,
  ADD COLUMN IF NOT EXISTS "city" TEXT,
  ADD COLUMN IF NOT EXISTS "countryCode" TEXT,
  ADD COLUMN IF NOT EXISTS "category" TEXT,
  ADD COLUMN IF NOT EXISTS "featured" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "featuredRank" INTEGER,
  ADD COLUMN IF NOT EXISTS "claimMethod" "DealClaimMethod" NOT NULL DEFAULT 'IN_APP',
  ADD COLUMN IF NOT EXISTS "maxClaims" INTEGER,
  ADD COLUMN IF NOT EXISTS "terms" TEXT,
  ADD COLUMN IF NOT EXISTS "eligibility" TEXT,
  ADD COLUMN IF NOT EXISTS "included" TEXT,
  ADD COLUMN IF NOT EXISTS "excluded" TEXT,
  ADD COLUMN IF NOT EXISTS "viewCount" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "claimCount" INTEGER NOT NULL DEFAULT 0;

CREATE UNIQUE INDEX IF NOT EXISTS "Deal_coverMediaId_key" ON "Deal"("coverMediaId");
CREATE INDEX IF NOT EXISTS "Deal_status_featured_endDate_idx" ON "Deal"("status", "featured", "endDate");
CREATE INDEX IF NOT EXISTS "Deal_city_idx" ON "Deal"("city");
CREATE INDEX IF NOT EXISTS "Deal_category_idx" ON "Deal"("category");
CREATE INDEX IF NOT EXISTS "Deal_featured_featuredRank_idx" ON "Deal"("featured", "featuredRank");

ALTER TABLE "MediaAsset" ADD COLUMN IF NOT EXISTS "dealId" TEXT;
CREATE INDEX IF NOT EXISTS "MediaAsset_dealId_idx" ON "MediaAsset"("dealId");

ALTER TABLE "MediaUploadIntent" ADD COLUMN IF NOT EXISTS "dealId" TEXT;

DO $$ BEGIN
  ALTER TABLE "Deal" ADD CONSTRAINT "Deal_coverMediaId_fkey"
    FOREIGN KEY ("coverMediaId") REFERENCES "MediaAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "MediaAsset" ADD CONSTRAINT "MediaAsset_dealId_fkey"
    FOREIGN KEY ("dealId") REFERENCES "Deal"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "JourneyDeal" (
    "id" TEXT NOT NULL,
    "journeyId" TEXT NOT NULL,
    "dealId" TEXT NOT NULL,
    "addedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JourneyDeal_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "JourneyDeal_journeyId_dealId_key" ON "JourneyDeal"("journeyId", "dealId");
CREATE INDEX IF NOT EXISTS "JourneyDeal_dealId_idx" ON "JourneyDeal"("dealId");
CREATE INDEX IF NOT EXISTS "JourneyDeal_addedById_idx" ON "JourneyDeal"("addedById");

DO $$ BEGIN
  ALTER TABLE "JourneyDeal" ADD CONSTRAINT "JourneyDeal_journeyId_fkey"
    FOREIGN KEY ("journeyId") REFERENCES "Journey"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "JourneyDeal" ADD CONSTRAINT "JourneyDeal_dealId_fkey"
    FOREIGN KEY ("dealId") REFERENCES "Deal"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "JourneyDeal" ADD CONSTRAINT "JourneyDeal_addedById_fkey"
    FOREIGN KEY ("addedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "DealClaim" (
    "id" TEXT NOT NULL,
    "dealId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "DealClaimStatus" NOT NULL DEFAULT 'PENDING',
    "code" TEXT NOT NULL,
    "note" TEXT,
    "titleSnapshot" TEXT NOT NULL,
    "discountTypeSnapshot" "DealDiscountType" NOT NULL,
    "discountValueSnapshot" DECIMAL(12,2) NOT NULL,
    "currencySnapshot" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DealClaim_pkey" PRIMARY KEY ("id")
);

-- CREATE TABLE IF NOT EXISTS does not add columns if DealClaim already existed.
ALTER TABLE "DealClaim" ADD COLUMN IF NOT EXISTS "titleSnapshot" TEXT;
ALTER TABLE "DealClaim" ADD COLUMN IF NOT EXISTS "discountTypeSnapshot" "DealDiscountType";
ALTER TABLE "DealClaim" ADD COLUMN IF NOT EXISTS "discountValueSnapshot" DECIMAL(12,2);
ALTER TABLE "DealClaim" ADD COLUMN IF NOT EXISTS "currencySnapshot" TEXT;

UPDATE "DealClaim" AS c
SET
  "titleSnapshot" = COALESCE(c."titleSnapshot", d.title, 'Deal'),
  "discountTypeSnapshot" = COALESCE(c."discountTypeSnapshot", d."discountType"),
  "discountValueSnapshot" = COALESCE(c."discountValueSnapshot", d."discountValue"),
  "currencySnapshot" = COALESCE(c."currencySnapshot", d.currency, 'USD')
FROM "Deal" AS d
WHERE c."dealId" = d.id;

UPDATE "DealClaim"
SET
  "titleSnapshot" = COALESCE("titleSnapshot", 'Deal'),
  "discountTypeSnapshot" = COALESCE("discountTypeSnapshot", 'PERCENTAGE'),
  "discountValueSnapshot" = COALESCE("discountValueSnapshot", 0),
  "currencySnapshot" = COALESCE("currencySnapshot", 'USD');

ALTER TABLE "DealClaim"
  ALTER COLUMN "titleSnapshot" SET NOT NULL,
  ALTER COLUMN "discountTypeSnapshot" SET NOT NULL,
  ALTER COLUMN "discountValueSnapshot" SET NOT NULL,
  ALTER COLUMN "currencySnapshot" SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "DealClaim_userId_dealId_key" ON "DealClaim"("userId", "dealId");
CREATE UNIQUE INDEX IF NOT EXISTS "DealClaim_code_key" ON "DealClaim"("code");
CREATE INDEX IF NOT EXISTS "DealClaim_dealId_status_idx" ON "DealClaim"("dealId", "status");
CREATE INDEX IF NOT EXISTS "DealClaim_userId_createdAt_idx" ON "DealClaim"("userId", "createdAt");

DO $$ BEGIN
  ALTER TABLE "DealClaim" ADD CONSTRAINT "DealClaim_dealId_fkey"
    FOREIGN KEY ("dealId") REFERENCES "Deal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "DealClaim" ADD CONSTRAINT "DealClaim_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "DealReport" (
    "id" TEXT NOT NULL,
    "dealId" TEXT NOT NULL,
    "reporterId" TEXT NOT NULL,
    "reason" "DealReportReason" NOT NULL,
    "details" TEXT,
    "status" "DealReportStatus" NOT NULL DEFAULT 'OPEN',
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "resolution" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DealReport_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "DealReport_reporterId_dealId_key" ON "DealReport"("reporterId", "dealId");
CREATE INDEX IF NOT EXISTS "DealReport_dealId_idx" ON "DealReport"("dealId");
CREATE INDEX IF NOT EXISTS "DealReport_status_createdAt_idx" ON "DealReport"("status", "createdAt");

DO $$ BEGIN
  ALTER TABLE "DealReport" ADD CONSTRAINT "DealReport_dealId_fkey"
    FOREIGN KEY ("dealId") REFERENCES "Deal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "DealReport" ADD CONSTRAINT "DealReport_reporterId_fkey"
    FOREIGN KEY ("reporterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "DealReport" ADD CONSTRAINT "DealReport_reviewedById_fkey"
    FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "DealAnalyticsEvent" (
    "id" TEXT NOT NULL,
    "dealId" TEXT NOT NULL,
    "userId" TEXT,
    "kind" "DealAnalyticsKind" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DealAnalyticsEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "DealAnalyticsEvent_dealId_kind_createdAt_idx" ON "DealAnalyticsEvent"("dealId", "kind", "createdAt");
CREATE INDEX IF NOT EXISTS "DealAnalyticsEvent_createdAt_idx" ON "DealAnalyticsEvent"("createdAt");

DO $$ BEGIN
  ALTER TABLE "DealAnalyticsEvent" ADD CONSTRAINT "DealAnalyticsEvent_dealId_fkey"
    FOREIGN KEY ("dealId") REFERENCES "Deal"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
