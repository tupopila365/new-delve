-- Listing monetary price + Deal published-base freeze. Existing rows stay null (no invented prices).

ALTER TABLE "Listing"
  ADD COLUMN IF NOT EXISTS "priceAmount" DECIMAL(12, 2),
  ADD COLUMN IF NOT EXISTS "currency" VARCHAR(3);

ALTER TABLE "Deal"
  ADD COLUMN IF NOT EXISTS "publishedBasePrice" DECIMAL(12, 2),
  ADD COLUMN IF NOT EXISTS "publishedCurrency" VARCHAR(3);
