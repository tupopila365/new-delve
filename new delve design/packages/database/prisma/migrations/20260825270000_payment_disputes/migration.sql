-- Stripe disputes / chargebacks. Does not edit payment, settlement, refund, or reversal migrations.

ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'PAYMENT_DISPUTE_OPENED';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'PAYMENT_DISPUTE_WON';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'PAYMENT_DISPUTE_LOST';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'PAYMENT_DISPUTE_BLOCKED';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'PAYMENT_DISPUTE_REVERSED';

ALTER TYPE "TransferReversalReason" ADD VALUE IF NOT EXISTS 'DISPUTE_LOSS';

CREATE TYPE "PaymentDisputeStatus" AS ENUM (
  'NEEDS_RESPONSE',
  'UNDER_REVIEW',
  'WARNING',
  'WON',
  'LOST',
  'CLOSED'
);

CREATE TYPE "PaymentDisputeRecoveryStatus" AS ENUM (
  'NOT_REQUIRED',
  'BLOCKED_SETTLEMENT',
  'RECOVERY_PENDING',
  'RECOVERY_REQUIRED',
  'RECOVERED',
  'RECOVERY_FAILED',
  'MANUAL_REVIEW'
);

CREATE TABLE "PaymentDispute" (
  "id" TEXT NOT NULL,
  "paymentId" TEXT NOT NULL,
  "bookingId" TEXT NOT NULL,
  "businessId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "provider" "PaymentProvider" NOT NULL DEFAULT 'STRIPE',
  "stripeDisputeId" TEXT NOT NULL,
  "stripeChargeId" TEXT,
  "stripePaymentIntentId" TEXT,
  "status" "PaymentDisputeStatus" NOT NULL DEFAULT 'NEEDS_RESPONSE',
  "stripeStatus" TEXT NOT NULL,
  "amount" DECIMAL(12, 2) NOT NULL,
  "currency" VARCHAR(3) NOT NULL,
  "reason" TEXT NOT NULL,
  "isChargeRefundable" BOOLEAN,
  "evidenceDueAt" TIMESTAMP(3),
  "needsResponseAt" TIMESTAMP(3),
  "submittedAt" TIMESTAMP(3),
  "closedAt" TIMESTAMP(3),
  "wonAt" TIMESTAMP(3),
  "lostAt" TIMESTAMP(3),
  "lastStripeEventAt" TIMESTAMP(3),
  "lastStripeEventCreated" INTEGER,
  "recoveryStatus" "PaymentDisputeRecoveryStatus" NOT NULL DEFAULT 'NOT_REQUIRED',
  "exposureCode" TEXT,
  "providerEvidenceNote" TEXT,
  "providerEvidenceAt" TIMESTAMP(3),
  "providerEvidenceById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "PaymentDispute_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PaymentDispute_stripeDisputeId_key" ON "PaymentDispute"("stripeDisputeId");
CREATE INDEX "PaymentDispute_paymentId_status_idx" ON "PaymentDispute"("paymentId", "status");
CREATE INDEX "PaymentDispute_bookingId_idx" ON "PaymentDispute"("bookingId");
CREATE INDEX "PaymentDispute_businessId_status_idx" ON "PaymentDispute"("businessId", "status");
CREATE INDEX "PaymentDispute_status_createdAt_idx" ON "PaymentDispute"("status", "createdAt");
CREATE INDEX "PaymentDispute_recoveryStatus_idx" ON "PaymentDispute"("recoveryStatus");

ALTER TABLE "PaymentDispute" ADD CONSTRAINT "PaymentDispute_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PaymentDispute" ADD CONSTRAINT "PaymentDispute_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PaymentDispute" ADD CONSTRAINT "PaymentDispute_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PaymentDispute" ADD CONSTRAINT "PaymentDispute_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "Payment_stripeChargeId_idx" ON "Payment"("stripeChargeId");

CREATE TABLE "UnmatchedStripeFinancialEvent" (
  "id" TEXT NOT NULL,
  "providerEventId" TEXT NOT NULL,
  "eventType" TEXT NOT NULL,
  "stripeObjectId" TEXT,
  "chargeId" TEXT,
  "paymentIntentId" TEXT,
  "note" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "UnmatchedStripeFinancialEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "UnmatchedStripeFinancialEvent_providerEventId_key" ON "UnmatchedStripeFinancialEvent"("providerEventId");
CREATE INDEX "UnmatchedStripeFinancialEvent_createdAt_idx" ON "UnmatchedStripeFinancialEvent"("createdAt");
