-- CreateEnum
CREATE TYPE "DealDiscountType" AS ENUM ('PERCENTAGE', 'FIXED_AMOUNT');

-- CreateEnum
CREATE TYPE "DealStatus" AS ENUM ('DRAFT', 'PENDING_REVIEW', 'PUBLISHED', 'EXPIRED', 'REJECTED', 'ARCHIVED');

-- CreateTable
CREATE TABLE "Deal" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "listingId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "discountType" "DealDiscountType" NOT NULL,
    "discountValue" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "status" "DealStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Deal_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Deal_businessId_status_idx" ON "Deal"("businessId", "status");

-- CreateIndex
CREATE INDEX "Deal_listingId_idx" ON "Deal"("listingId");

-- CreateIndex
CREATE INDEX "Deal_status_startDate_endDate_idx" ON "Deal"("status", "startDate", "endDate");

-- CreateIndex
CREATE INDEX "Deal_businessId_createdAt_idx" ON "Deal"("businessId", "createdAt");

-- AddForeignKey
ALTER TABLE "Deal" ADD CONSTRAINT "Deal_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Deal" ADD CONSTRAINT "Deal_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE SET NULL ON UPDATE CASCADE;
