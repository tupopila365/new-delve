-- Claim redemption: snapshots, expiry, redeemedAt, REDEEM analytics.

ALTER TYPE "DealAnalyticsKind" ADD VALUE IF NOT EXISTS 'REDEEM';

ALTER TABLE "DealClaim" ADD COLUMN IF NOT EXISTS "titleSnapshot" TEXT;
ALTER TABLE "DealClaim" ADD COLUMN IF NOT EXISTS "discountTypeSnapshot" "DealDiscountType";
ALTER TABLE "DealClaim" ADD COLUMN IF NOT EXISTS "discountValueSnapshot" DECIMAL(12,2);
ALTER TABLE "DealClaim" ADD COLUMN IF NOT EXISTS "currencySnapshot" TEXT;

ALTER TABLE "DealClaim"
  ADD COLUMN IF NOT EXISTS "originalPriceSnapshot" DECIMAL(12, 2),
  ADD COLUMN IF NOT EXISTS "dealPriceSnapshot" DECIMAL(12, 2),
  ADD COLUMN IF NOT EXISTS "discountSummarySnapshot" TEXT,
  ADD COLUMN IF NOT EXISTS "termsSnapshot" TEXT,
  ADD COLUMN IF NOT EXISTS "eligibilitySnapshot" TEXT,
  ADD COLUMN IF NOT EXISTS "includedSnapshot" TEXT,
  ADD COLUMN IF NOT EXISTS "excludedSnapshot" TEXT,
  ADD COLUMN IF NOT EXISTS "redemptionInstructionsSnapshot" TEXT,
  ADD COLUMN IF NOT EXISTS "expiresAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "redeemedAt" TIMESTAMP(3);

UPDATE "DealClaim" AS c
SET
  "titleSnapshot" = COALESCE(c."titleSnapshot", d.title, 'Deal'),
  "discountTypeSnapshot" = COALESCE(c."discountTypeSnapshot", d."discountType"),
  "discountValueSnapshot" = COALESCE(c."discountValueSnapshot", d."discountValue"),
  "currencySnapshot" = COALESCE(c."currencySnapshot", d.currency, 'USD'),
  "expiresAt" = COALESCE(c."expiresAt", d."endDate"),
  "discountSummarySnapshot" = COALESCE(
    c."discountSummarySnapshot",
    CASE
      WHEN c."discountTypeSnapshot" = 'PERCENTAGE' THEN TRIM(TRAILING '.' FROM TRIM(TRAILING '0' FROM c."discountValueSnapshot"::text)) || '% off'
      ELSE c."currencySnapshot" || ' ' || TRIM(TRAILING '.' FROM TRIM(TRAILING '0' FROM c."discountValueSnapshot"::text)) || ' off'
    END
  ),
  "termsSnapshot" = COALESCE(c."termsSnapshot", d.terms),
  "eligibilitySnapshot" = COALESCE(c."eligibilitySnapshot", d.eligibility),
  "includedSnapshot" = COALESCE(c."includedSnapshot", d.included),
  "excludedSnapshot" = COALESCE(c."excludedSnapshot", d.excluded)
FROM "Deal" AS d
WHERE c."dealId" = d.id;

UPDATE "DealClaim"
SET "expiresAt" = COALESCE("expiresAt", "createdAt")
WHERE "expiresAt" IS NULL;

UPDATE "DealClaim"
SET "discountSummarySnapshot" = COALESCE("discountSummarySnapshot", 'Deal')
WHERE "discountSummarySnapshot" IS NULL;

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
  ALTER COLUMN "currencySnapshot" SET NOT NULL,
  ALTER COLUMN "expiresAt" SET NOT NULL,
  ALTER COLUMN "discountSummarySnapshot" SET NOT NULL;

CREATE INDEX IF NOT EXISTS "DealClaim_expiresAt_status_idx" ON "DealClaim"("expiresAt", "status");
