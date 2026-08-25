-- Booking/reservation foundation. Existing listings, deals, and claims are unchanged.

CREATE TYPE "BookingStatus" AS ENUM (
  'PENDING',
  'PENDING_PAYMENT',
  'CONFIRMED',
  'CANCELLED',
  'COMPLETED',
  'EXPIRED'
);

ALTER TYPE "NotificationType" ADD VALUE 'BOOKING_CREATED';
ALTER TYPE "NotificationType" ADD VALUE 'BOOKING_CONFIRMED';
ALTER TYPE "NotificationType" ADD VALUE 'BOOKING_CANCELLED';
ALTER TYPE "NotificationType" ADD VALUE 'BOOKING_COMPLETED';

CREATE TABLE "Booking" (
  "id" TEXT NOT NULL,
  "bookingReference" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "businessId" TEXT NOT NULL,
  "listingId" TEXT NOT NULL,
  "dealId" TEXT,
  "dealClaimId" TEXT,
  "status" "BookingStatus" NOT NULL DEFAULT 'PENDING',
  "startDateTime" TIMESTAMP(3),
  "endDateTime" TIMESTAMP(3),
  "quantity" INTEGER NOT NULL DEFAULT 1,
  "guestCount" INTEGER,
  "customerNote" TEXT,
  "originalAmount" DECIMAL(12, 2) NOT NULL,
  "discountAmount" DECIMAL(12, 2) NOT NULL,
  "finalAmount" DECIMAL(12, 2) NOT NULL,
  "currency" VARCHAR(3) NOT NULL,
  "listingTitleSnapshot" TEXT NOT NULL,
  "dealTitleSnapshot" TEXT,
  "discountSummarySnapshot" TEXT,
  "cancelReason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "confirmedAt" TIMESTAMP(3),
  "cancelledAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),

  CONSTRAINT "Booking_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Booking_bookingReference_key" ON "Booking"("bookingReference");
CREATE INDEX "Booking_userId_createdAt_idx" ON "Booking"("userId", "createdAt");
CREATE INDEX "Booking_businessId_status_idx" ON "Booking"("businessId", "status");
CREATE INDEX "Booking_listingId_idx" ON "Booking"("listingId");
CREATE INDEX "Booking_dealId_idx" ON "Booking"("dealId");
CREATE INDEX "Booking_dealClaimId_idx" ON "Booking"("dealClaimId");
CREATE INDEX "Booking_status_createdAt_idx" ON "Booking"("status", "createdAt");
CREATE INDEX "Booking_bookingReference_idx" ON "Booking"("bookingReference");

ALTER TABLE "Booking" ADD CONSTRAINT "Booking_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "Deal"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_dealClaimId_fkey" FOREIGN KEY ("dealClaimId") REFERENCES "DealClaim"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "JourneyBooking" (
  "id" TEXT NOT NULL,
  "journeyId" TEXT NOT NULL,
  "bookingId" TEXT NOT NULL,
  "addedById" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "JourneyBooking_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "JourneyBooking_journeyId_bookingId_key" ON "JourneyBooking"("journeyId", "bookingId");
CREATE INDEX "JourneyBooking_bookingId_idx" ON "JourneyBooking"("bookingId");
CREATE INDEX "JourneyBooking_addedById_idx" ON "JourneyBooking"("addedById");

ALTER TABLE "JourneyBooking" ADD CONSTRAINT "JourneyBooking_journeyId_fkey" FOREIGN KEY ("journeyId") REFERENCES "Journey"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "JourneyBooking" ADD CONSTRAINT "JourneyBooking_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "JourneyBooking" ADD CONSTRAINT "JourneyBooking_addedById_fkey" FOREIGN KEY ("addedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
