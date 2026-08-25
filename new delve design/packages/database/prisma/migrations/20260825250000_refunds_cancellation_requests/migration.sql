-- Refunds + paid booking cancellation requests. Does not edit payment/settlement migrations.

CREATE TYPE "RefundStatus" AS ENUM (
  'PENDING',
  'PROCESSING',
  'SUCCEEDED',
  'FAILED',
  'CANCELLED'
);

CREATE TYPE "RefundReason" AS ENUM (
  'TRAVELER_CANCELLATION',
  'PROVIDER_CANCELLATION',
  'SERVICE_UNAVAILABLE',
  'DUPLICATE_PAYMENT',
  'ADMIN_ADJUSTMENT',
  'OTHER'
);

CREATE TYPE "RefundActorType" AS ENUM (
  'TRAVELER',
  'PROVIDER',
  'ADMIN'
);

CREATE TYPE "CancellationRequestStatus" AS ENUM (
  'PENDING',
  'APPROVED',
  'REJECTED',
  'COMPLETED'
);

ALTER TYPE "NotificationType" ADD VALUE 'BOOKING_CANCELLATION_REQUESTED';
ALTER TYPE "NotificationType" ADD VALUE 'REFUND_PROCESSING';
ALTER TYPE "NotificationType" ADD VALUE 'REFUND_SUCCEEDED';
ALTER TYPE "NotificationType" ADD VALUE 'REFUND_FAILED';

CREATE TABLE "BookingCancellationRequest" (
  "id" TEXT NOT NULL,
  "bookingId" TEXT NOT NULL,
  "requestedByUserId" TEXT NOT NULL,
  "requestedByType" "RefundActorType" NOT NULL,
  "reason" "RefundReason" NOT NULL,
  "note" TEXT,
  "status" "CancellationRequestStatus" NOT NULL DEFAULT 'PENDING',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "reviewedAt" TIMESTAMP(3),
  "reviewedByUserId" TEXT,

  CONSTRAINT "BookingCancellationRequest_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "BookingCancellationRequest_bookingId_status_idx" ON "BookingCancellationRequest"("bookingId", "status");
CREATE INDEX "BookingCancellationRequest_status_createdAt_idx" ON "BookingCancellationRequest"("status", "createdAt");

ALTER TABLE "BookingCancellationRequest" ADD CONSTRAINT "BookingCancellationRequest_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "BookingCancellationRequest" ADD CONSTRAINT "BookingCancellationRequest_requestedByUserId_fkey" FOREIGN KEY ("requestedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "BookingCancellationRequest" ADD CONSTRAINT "BookingCancellationRequest_reviewedByUserId_fkey" FOREIGN KEY ("reviewedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "Refund" (
  "id" TEXT NOT NULL,
  "paymentId" TEXT NOT NULL,
  "bookingId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "businessId" TEXT NOT NULL,
  "cancellationRequestId" TEXT,
  "provider" "PaymentProvider" NOT NULL DEFAULT 'STRIPE',
  "stripeRefundId" TEXT,
  "status" "RefundStatus" NOT NULL DEFAULT 'PENDING',
  "amount" DECIMAL(12, 2) NOT NULL,
  "currency" VARCHAR(3) NOT NULL,
  "reason" "RefundReason" NOT NULL,
  "explanation" TEXT,
  "requestedByType" "RefundActorType" NOT NULL,
  "requestedByUserId" TEXT,
  "idempotencyKey" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "processingAt" TIMESTAMP(3),
  "succeededAt" TIMESTAMP(3),
  "failedAt" TIMESTAMP(3),
  "cancelledAt" TIMESTAMP(3),
  "failureCode" TEXT,
  "failureMessage" TEXT,

  CONSTRAINT "Refund_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Refund_stripeRefundId_key" ON "Refund"("stripeRefundId");
CREATE UNIQUE INDEX "Refund_idempotencyKey_key" ON "Refund"("idempotencyKey");
CREATE INDEX "Refund_paymentId_status_idx" ON "Refund"("paymentId", "status");
CREATE INDEX "Refund_bookingId_status_idx" ON "Refund"("bookingId", "status");
CREATE INDEX "Refund_businessId_status_idx" ON "Refund"("businessId", "status");
CREATE INDEX "Refund_status_createdAt_idx" ON "Refund"("status", "createdAt");

ALTER TABLE "Refund" ADD CONSTRAINT "Refund_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Refund" ADD CONSTRAINT "Refund_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Refund" ADD CONSTRAINT "Refund_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Refund" ADD CONSTRAINT "Refund_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Refund" ADD CONSTRAINT "Refund_cancellationRequestId_fkey" FOREIGN KEY ("cancellationRequestId") REFERENCES "BookingCancellationRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;
