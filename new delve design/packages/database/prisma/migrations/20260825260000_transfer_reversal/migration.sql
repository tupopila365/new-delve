-- Transfer reversal recovery for already-settled bookings. Does not edit refund/settlement migrations.

ALTER TYPE "NotificationType" ADD VALUE 'SETTLEMENT_REVERSED';
ALTER TYPE "BusinessPayableStatus" ADD VALUE 'REVERSED';

CREATE TYPE "TransferReversalStatus" AS ENUM (
  'PENDING',
  'PROCESSING',
  'SUCCEEDED',
  'FAILED'
);

CREATE TYPE "TransferReversalReason" AS ENUM (
  'BOOKING_REFUND'
);

CREATE TABLE "TransferReversal" (
  "id" TEXT NOT NULL,
  "businessPayableId" TEXT NOT NULL,
  "paymentId" TEXT NOT NULL,
  "bookingId" TEXT NOT NULL,
  "refundId" TEXT,
  "businessId" TEXT NOT NULL,
  "stripeTransferId" TEXT NOT NULL,
  "stripeTransferReversalId" TEXT,
  "status" "TransferReversalStatus" NOT NULL DEFAULT 'PENDING',
  "amount" DECIMAL(12, 2) NOT NULL,
  "currency" VARCHAR(3) NOT NULL,
  "reason" "TransferReversalReason" NOT NULL DEFAULT 'BOOKING_REFUND',
  "idempotencyKey" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "processingAt" TIMESTAMP(3),
  "succeededAt" TIMESTAMP(3),
  "failedAt" TIMESTAMP(3),
  "failureCode" TEXT,
  "failureMessage" TEXT,

  CONSTRAINT "TransferReversal_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TransferReversal_businessPayableId_key" ON "TransferReversal"("businessPayableId");
CREATE UNIQUE INDEX "TransferReversal_stripeTransferReversalId_key" ON "TransferReversal"("stripeTransferReversalId");
CREATE UNIQUE INDEX "TransferReversal_idempotencyKey_key" ON "TransferReversal"("idempotencyKey");
CREATE INDEX "TransferReversal_paymentId_status_idx" ON "TransferReversal"("paymentId", "status");
CREATE INDEX "TransferReversal_bookingId_status_idx" ON "TransferReversal"("bookingId", "status");
CREATE INDEX "TransferReversal_refundId_idx" ON "TransferReversal"("refundId");
CREATE INDEX "TransferReversal_status_createdAt_idx" ON "TransferReversal"("status", "createdAt");

ALTER TABLE "TransferReversal" ADD CONSTRAINT "TransferReversal_businessPayableId_fkey" FOREIGN KEY ("businessPayableId") REFERENCES "BusinessPayable"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TransferReversal" ADD CONSTRAINT "TransferReversal_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TransferReversal" ADD CONSTRAINT "TransferReversal_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TransferReversal" ADD CONSTRAINT "TransferReversal_refundId_fkey" FOREIGN KEY ("refundId") REFERENCES "Refund"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "TransferReversal" ADD CONSTRAINT "TransferReversal_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
